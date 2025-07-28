import { formatNumber } from "../../utils.mjs";
import Dialog5e from "../../applications/api/dialog.mjs";

/**
 * @typedef BastionTurnResult
 * @property {string} [order]             The order that was completed, if any.
 * @property {number} [gold]              Gold generated.
 * @property {BastionTurnItem[]} [items]  Items created.
 */

/**
 * @typedef BastionTurnItem
 * @property {string} uuid      The UUID of the generated Item.
 * @property {number} quantity  The quantity of items generated.
 */

/**
 * A singleton class that manages global Bastion activity.
 */
export default class Bastion {
  /**
   * The template for the chat card summary of a bastion attack.
   * @type {string}
   */
  static ATTACK_TEMPLATE = "systems/dnd5e/templates/chat/bastion-attack-summary.hbs";

  /**
   * The template for the chat card summary of a bastion turn.
   * @type {string}
   */
  static TURN_TEMPLATE = "systems/dnd5e/templates/chat/bastion-turn-summary.hbs";

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /**
   * Advance all bastions by a turn.
   * @returns {Promise<void>}
   */
  async advanceAllBastions() {
    // TODO: Should this advance game.time?
    const { duration } = game.settings.get("dnd5e", "bastionConfiguration");
    const haveBastions = game.actors.filter(a => (a.type === "character") && a.itemTypes.facility.length);
    for ( const actor of haveBastions ) await this.advanceAllFacilities(actor, { duration });
  }

  /* -------------------------------------------- */

  /**
   * Advance all the facilities of a given Actor by one bastion turn.
   * @param {Actor5e} actor                   The actor.
   * @param {object} [options]
   * @param {number} [options.duration=7]     The number of days the bastion turn spanned.
   * @param {boolean} [options.summary=true]  Print a chat message summary of the turn.
   * @returns {Promise<void>}
   */
  async advanceAllFacilities(actor, { duration=7, summary=true }={}) {
    const results = { orders: [], items: [], gold: 0 };
    for ( const facility of actor.itemTypes.facility ) {
      const { order, gold, items } = await this.advanceTurn(facility, { duration });
      if ( !order || (order === "maintain") ) continue;
      if ( gold ) results.gold += gold;
      if ( items ) results.items.push(...items);
      results.orders.push({ id: facility.id, order });
    }

    if ( summary ) {
      results.gold = { value: results.gold, claimed: false };
      const content = await this.#renderTurnSummary(actor, results);
      await ChatMessage.implementation.create({
        content,
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        flags: { dnd5e: { bastion: results } }
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Advance the given facility by one bastion turn.
   * @param {Item5e} facility              The facility.
   * @param {object} [options]
   * @param {number} [options.duration=7]  The number of days the bastion turn spanned.
   * @returns {Promise<BastionTurnResult>}
   */
  async advanceTurn(facility, { duration=7 }={}) {
    const { disabled, progress, type } = facility.system;

    // Case 1 - No order in progress.
    if ( !progress.max && !disabled ) {
      await facility.update({ "system.progress.order": "" });
      if ( type.value === "basic" ) return {}; // Basic facilities do nothing.
      return { order: "maintain" }; // Special facilities are considered to have been issued the maintain order.
    }

    const newProgress = Math.min(progress.value + duration, progress.max);

    // Case 2 - Order incomplete. Ongoing progress.
    if ( (newProgress < progress.max) && !disabled ) {
      await facility.update({ "system.progress.value": newProgress });
      return {};
    }

    // Case 3 - Order complete.
    const updates = { "system.progress": { value: 0, max: null, order: "" } };
    const { gold, items } = this.#evaluateOrder(facility, progress.order, updates);
    await facility.update(updates);
    return { gold, items, order: progress.order };
  }

  /* -------------------------------------------- */

  /**
   * Resolve a bastion attack against a given Actor's bastion.
   * @param {Actor5e} actor   The Actor.
   * @param {string} formula  The attack formula.
   * @param {object} [options]
   * @param {boolean} [options.summary=true]  Print a chat message summary of the attack.
   * @param {number} [options.threshold=1]    The maximum number on a die roll that is considered a defender death.
   * @returns {Promise<number>}               The number of defenders who died in the attack.
   */
  async resolveAttack(actor, formula, { summary=true, threshold=1 }={}) {
    const results = {};
    const roll = await Roll.create(formula).evaluate();
    const deaths = roll.dice.reduce((count, die) => {
      return count + die.results.filter(({ result, active }) => active && (result <= threshold)).length;
    }, 0);
    const defenders = this.#getDefenders(actor);
    if ( defenders.length ) results.deaths = Math.min(deaths, defenders.length);
    else results.undefended = true;
    if ( summary ) {
      const content = await this.#renderAttackSummary(actor, roll, results);
      await ChatMessage.implementation.create({
        content,
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        rolls: [roll],
        flags: { dnd5e: { bastion: results } }
      });
    }
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Attach interactivity to chat messages.
   * @param {ChatMessage5e} message  The chat message.
   * @param {HTMLElement} html       The rendered chat card element.
   * @internal
   */
  _activateChatListeners(message, html) {
    html.addEventListener("click", event => {
      const target = event.target.closest("[data-action]");
      if ( target ) this.#onChatAction(event, target, message);
    }, { passive: true });

    const actor = message.getAssociatedActor();
    if ( !actor?.isOwner ) return;

    html.querySelectorAll(".item-summary > li").forEach(async el => {
      const { uuid, quantity } = el.dataset;
      const item = await fromUuid(uuid);
      if ( !item ) return;
      el.draggable = true;
      el.addEventListener("dragstart", event => {
        this.#onDragItem(event, item, { "system.quantity": Number(quantity) });
      });
    });
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of an order.
   * @param {Item5e} facility  The facility.
   * @param {string} order     The order that was completed.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateOrder(facility, order, updates) {
    switch ( order ) {
      case "build": return this.#evaluateBuildOrder(facility, updates);
      case "craft": return this.#evaluateCraftOrder(facility, updates);
      case "enlarge": return this.#evaluateEnlargeOrder(facility, updates);
      case "harvest": return this.#evaluateHarvestOrder(facility, updates);
      case "repair": return this.#evaluateRepairOrder(facility, updates);
      case "trade": return this.#evaluateTradeOrder(facility, updates);
    }
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of a build order.
   * @param {Item5e} facility  The facility.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateBuildOrder(facility, updates) {
    const { building } = facility.system;
    updates["system.building.built"] = true;
    updates["system.size"] = building.size;
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of a craft order.
   * @param {Item5e} facility          The facility.
   * @param {object} updates           Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateCraftOrder(facility, updates) {
    const { craft } = facility.system;
    updates["system.craft.item"] = null;
    return { items: [{ uuid: craft.item, quantity: 1 }] };
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of an enlarge order.
   * @param {Item5e} facility  The facility.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateEnlargeOrder(facility, updates) {
    const { size } = facility.system;
    const sizes = Object.entries(CONFIG.DND5E.facilities.sizes).sort((a, b) => a.value - b.value);
    const index = sizes.findIndex(([key]) => key === size);
    const [next] = sizes[index + 1];
    updates["system.size"] = next;
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of a harvest order.
   * @param {Item5e} facility  The facility.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateHarvestOrder(facility, updates) {
    const { craft } = facility.system;
    return { items: [{ uuid: craft.item, quantity: craft.quantity }] };
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of a repair order.
   * @param {Item5e} facility  The facility.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateRepairOrder(facility, updates) {
    updates["system.disabled"] = false;
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Evaluate the completion of a trade order.
   * @param {Item5e} facility  The facility.
   * @param {object} updates   Facility updates.
   * @returns {Omit<BastionTurnResult, "order">}
   */
  #evaluateTradeOrder(facility, updates) {
    const { trade } = facility.system;
    updates["system.trade.pending.operation"] = null;
    updates["system.trade.pending.creatures"] = [];
    updates["system.trade.pending.value"] = null;
    if ( !trade.pending.operation ) return {};

    if ( trade.pending.operation === "buy" ) {
      // Stocked facility
      if ( (trade.pending.value === null) && trade.pending.stocked ) updates["system.trade.stock.stocked"] = true;

      // Bought goods
      else if ( trade.pending.value !== null ) {
        if ( trade.pending.creatures.length ) {
          updates["system.trade.creatures.value"] = trade.creatures.value.concat(trade.pending.creatures);
        }
        else updates["system.trade.stock.value"] = Math.min(trade.stock.value + trade.pending.value, trade.stock.max);
      }
    } else if ( trade.pending.value !== null ) {
      // Sold goods
      let sold = trade.pending.value;
      if ( !trade.pending.creatures.length ) {
        updates["system.trade.stock.value"] = Math.max(0, trade.stock.value - trade.pending.value);
        sold = trade.stock.value - updates["system.trade.stock.value"];
      }

      return { gold: Math.floor(sold * ((trade.profit / 100) + 1)) };
    }

    return {};
  }

  /* -------------------------------------------- */

  /**
   * Retrieve a list of defenders for the given Actor's bastion.
   * @param {Actor5e} actor  The actor.
   * @returns {{ facility: Item5e, uuid: string }[]}
   */
  #getDefenders(actor) {
    const allDefenders = [];
    for ( const facility of actor.itemTypes.facility ) {
      const { defenders, type } = facility.system;
      if ( (type.value === "special") && defenders.max ) {
        allDefenders.push(...defenders.value.map(uuid => ({ facility, uuid })));
      }
    }
    return allDefenders;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking action elements in chat cards.
   * @param {PointerEvent} event     The triggering event.
   * @param {HTMLElement} target     The action element.
   * @param {ChatMessage5e} message  The chat message.
   */
  #onChatAction(event, target, message) {
    const { action } = target.dataset;
    switch ( action ) {
      case "claim": this.#onClaimGold(message); break;
      case "resolve": this.#onResolveAttack(message); break;
      case "viewItem": this.#onViewItem(target); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle claiming gold from a bastion turn summary message.
   * @param {ChatMessage5e} message  The message.
   * @returns {Promise<ChatMessage5e|void>}
   */
  async #onClaimGold(message) {
    const results = message.getFlag("dnd5e", "bastion");
    const { gold } = results;
    const actor = message.getAssociatedActor();
    const { gp } = actor?.system?.currency ?? {};
    if ( !gold?.value || gold.claimed || (gp === undefined) ) return;
    await actor.update({ "system.currency.gp": gp + gold.value });
    gold.claimed = true;
    const content = await this.#renderTurnSummary(actor, results);
    return message.update({ content, flags: { dnd5e: { bastion: results } } });
  }

  /* -------------------------------------------- */

  /**
   * Handle dragging an item created as part of order completion.
   * @param {DragEvent} event    The initiating drag event.
   * @param {Item5e} item        The created item.
   * @param {object} [updates]   Updates to apply to the Item.
   */
  #onDragItem(event, item, updates={}) {
    // TODO: Need some way to mark the item as 'claimed' when it is dropped onto an Actor sheet.
    if ( !foundry.utils.isEmpty(updates) ) item.updateSource(updates);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      data: game.items.fromCompendium(item, { keepId: true }), type: "Item"
    }));
  }

  /* -------------------------------------------- */

  /**
   * Handle automatic resolution of a bastion attack via chat message.
   * @param {ChatMessage5e} message  The message.
   * @returns {Promise<ChatMessage5e|void>}
   */
  async #onResolveAttack(message) {
    const results = message.getFlag("dnd5e", "bastion") ?? {};
    const { deaths, undefended } = results;
    const actor = message.getAssociatedActor();
    if ( (!deaths && !undefended) || !actor ) return;

    if ( deaths ) {
      const defenders = this.#getDefenders(actor);
      const slain = [];
      for ( let i = 0; i < deaths; i++ ) {
        if ( !defenders.length ) break;
        const roll = await Roll.create(`1d${defenders.length}`).evaluate({ allowInteractive: false });
        const [defender] = defenders.splice(roll.total - 1, 1);
        slain.push(defender);
      }
      const updates = {};
      for ( const { facility, uuid } of slain ) {
        if ( !updates[facility.id] ) updates[facility.id] = [...facility.system.defenders.value];
        updates[facility.id].findSplice(a => a === uuid);
      }
      await actor.updateEmbeddedDocuments("Item", Object.entries(updates).map(([_id, value]) => {
        return { _id, "system.defenders.value": value };
      }));
    }

    let damaged;
    const defenders = this.#getDefenders(actor);
    if ( !defenders.length ) {
      const special = actor.itemTypes.facility.filter(f => (f.system.type.value === "special") && !f.system.disabled);
      if ( special.length ) {
        const roll = await Roll.create(`1d${special.length}`).evaluate({ allowInteractive: false });
        damaged = special[roll.total - 1];
        await damaged?.update({ "system.disabled": true });
      }
    }

    if ( damaged ) results.damaged = damaged.id;
    results.resolved = true;
    const content = await this.#renderAttackSummary(actor, message.rolls[0], results);
    return message.update({ content, flags: { dnd5e: { bastion: results } } });
  }

  /* -------------------------------------------- */

  /**
   * Handle viewing a created item.
   * @param {HTMLElement} target  The item element.
   * @returns {Promise}
   */
  async #onViewItem(target) {
    const { uuid } = target.dataset;
    const item = await fromUuid(uuid);
    return item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card summary for the bastion attack.
   * @param {Actor5e} actor                 The actor whose bastion was attacked.
   * @param {Roll} roll                     The bastion attack roll.
   * @param {object} [results]
   * @param {string} [results.damaged]      The ID of the facility damaged in the attack.
   * @param {number} [results.deaths]       The number of bastion defenders slain in the attack.
   * @param {boolean} [results.undefended]  If the bastion was undefended during the attack.
   * @param {boolean} [results.resolved]    Whether the attack has been automatically resolved.
   * @returns {Promise<string>}
   */
  async #renderAttackSummary(actor, roll, { damaged, deaths, undefended, resolved }={}) {
    const context = {};
    const plurals = new Intl.PluralRules(game.i18n.lang);
    const key = undefended ? "Undefended" : deaths ? `Deaths.${plurals.select(deaths)}` : "NoDeaths";
    context.description = game.i18n.format(`DND5E.Bastion.Attack.Result.${key}`, { deaths });
    context.roll = await roll.render();
    context.buttons = [];
    if ( !resolved && (deaths || undefended) ) {
      context.buttons.push({
        label: game.i18n.localize("DND5E.Bastion.Attack.Automatic"),
        icon: '<i class="fas fa-bolt"></i>',
        dataset: { action: "resolve" }
      });
    }
    if ( damaged ) {
      const facility = actor.items.get(damaged);
      if ( facility ) context.damaged = game.i18n.format("DND5E.Bastion.Attack.Result.Damaged", {
        link: facility.toAnchor().outerHTML
      });
    }
    return foundry.applications.handlebars.renderTemplate(this.constructor.ATTACK_TEMPLATE, context);
  }

  /* -------------------------------------------- */

  /**
   * Render a chat card summary for the bastion turn results.
   * @param {Actor5e} actor                                     The actor whose turn it was.
   * @param {object} results
   * @param {BastionTurnItem[]} results.items                   The items produced during the turn.
   * @param {{ value: number, claimed: boolean }} results.gold  Gold generated during the turn.
   * @param {{ id: string, order: string }[]} results.orders    Orders completed during the turn.
   * @returns {Promise<string>}
   */
  async #renderTurnSummary(actor, results) {
    const context = {};
    context.items = (await Promise.all(results.items.map(async ({ uuid, quantity }) => {
      const item = await fromUuid(uuid);
      if ( !item ) return null;
      const { name, img } = item;
      return { img, name, quantity, uuid };
    }))).filter(_ => _);
    context.orders = results.orders.map(({ id, order }) => {
      const facility = actor.items.get(id);
      return {
        name: facility.name,
        contentLink: facility.toAnchor().outerHTML,
        order: CONFIG.DND5E.facilities.orders[order]?.label
      };
    });
    context.supplements = [];
    if ( results.gold.value ) {
      context.supplements.push(`
        <strong>${game.i18n.localize("DND5E.CurrencyGP")}</strong>
        ${formatNumber(results.gold.value)}
        (${game.i18n.localize(`DND5E.Bastion.Gold.${results.gold.claimed ? "Claimed" : "Unclaimed"}`)})
      `);
    }
    context.buttons = [];
    if ( results.gold.value && !results.gold.claimed ) {
      context.buttons.push({
        label: game.i18n.localize("DND5E.Bastion.Gold.Claim"),
        icon: '<i class="fas fa-coins"></i>',
        dataset: { action: "claim" }
      });
    }
    return foundry.applications.handlebars.renderTemplate(this.constructor.TURN_TEMPLATE, context);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Confirm the bastion turn should be advanced.
   * @returns {Promise<void>}
   */
  async confirmAdvance() {
    if ( !game.user.isGM ) return;
    const proceed = await foundry.applications.api.DialogV2.confirm({
      content: game.i18n.localize("DND5E.Bastion.Confirm"),
      rejectClose: false
    });
    if ( proceed ) return this.advanceAllBastions();
  }

  /* -------------------------------------------- */

  /**
   * Initialize the bastion UI.
   */
  initializeUI() {
    const turnButton = document.getElementById("bastion-turn");
    const { button, enabled } = game.settings.get("dnd5e", "bastionConfiguration");

    if ( !enabled || !button || !game.user.isGM) {
      turnButton?.remove();
      return;
    }

    if ( !turnButton ) {
      document.querySelector("#controls, #scene-controls")?.insertAdjacentHTML("afterend", `
        <button type="button" id="bastion-turn" data-action="bastionTurn" class="dnd5e2 faded-ui">
          <i class="fas fa-chess-rook"></i>
          <span>${game.i18n.localize("DND5E.Bastion.Action.BastionTurn")}</span>
        </button>
      `);
      document.getElementById("bastion-turn")?.addEventListener("click", this.confirmAdvance.bind(this));
    }
  }

  /* -------------------------------------------- */

  /**
   * Prompt the DM to resolve a bastion attack against a specific Actor.
   * @param {Actor5e} [actor]  The Actor.
   * @returns {Promise}
   */
  async promptAttack(actor) {
    if ( !game.user.isGM ) return;

    // Determine Actor by selected token.
    if ( !actor ) {
      const [token] = canvas.tokens.controlled;
      actor = token?.actor;
    }

    // Determine Actor by active window.
    if ( !actor && (ui.activeWindow instanceof ActorSheet) ) actor = ui.activeWindow.actor;

    if ( !actor ) {
      ui.notifications.warn("DND5E.Bastion.Attack.NoActorWarning", { localize: true });
      return;
    }

    const formula = await BastionAttackDialog.prompt(actor);
    if ( formula ) return this.resolveAttack(actor, formula);
  }
}

/* -------------------------------------------- */

const { StringField } = foundry.data.fields;

/**
 * A dialog for resolving bastion attacks.
 */
class BastionAttackDialog extends Dialog5e {
  constructor({ actor, ...options }={}) {
    super(options);
    this.#actor = actor;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["bastion-attack"],
    window: {
      title: "DND5E.Bastion.Attack.Title",
      icon: "fas fa-chess-rook"
    },
    form: {
      handler: BastionAttackDialog.#handleFormSubmission
    },
    position: {
      width: 420
    },
    buttons: [{
      action: "resolve",
      label: "DND5E.Bastion.Attack.Resolve",
      icon: "fas fa-dice",
      default: true
    }]
  };

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/apps/bastion-attack-dialog.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Actor whose bastion is being attacked.
   * @type {Actor5e}
   */
  #actor;

  /**
   * The bastion attack formula.
   * @type {string|null}
   */
  get formula() {
    return this.#formula;
  }

  #formula = null;

  /** @override */
  get subtitle() {
    return this.#actor.name;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    context = await super._prepareContentContext(context, options);
    context.formula = {
      field: new StringField({ initial: "", label: "DND5E.Formula" }),
      name: "formula"
    };
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle submission of the dialog.
   * @this {BastionAttackDialog}
   * @param {SubmitEvent} event          The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   * @returns {Promise}
   */
  static #handleFormSubmission(event, form, formData) {
    this.#formula = formData.object.formula;
    return this.close({ dnd5e: { submitted: true } });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClose(options={}) {
    if ( !options.dnd5e?.submitted ) this.#formula = null;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Create the bastion attack prompt.
   * @param {Actor5e} actor      The Actor whose bastion is being attacked.
   * @returns {Promise<string>}  A promise that resolves to the input bastion attack formula.
   */
  static prompt(actor) {
    return new Promise(resolve => {
      const dialog = new this({ actor });
      dialog.addEventListener("close", () => resolve(dialog.formula), { once: true });
      dialog.render({ force: true });
    });
  }
}
