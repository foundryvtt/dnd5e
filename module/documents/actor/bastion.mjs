import { formatNumber } from "../../utils.mjs";

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
   * The template for the chat card summary of a bastion turn.
   * @type {string}
   */
  static SUMMARY_TEMPLATE = "systems/dnd5e/templates/chat/bastion-turn-summary.hbs";

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
      const content = await this.#renderSummary(actor, results);
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
    const { progress, type } = facility.system;

    // Case 1 - No order in progress.
    if ( !progress.max ) {
      await facility.update({ "system.progress.order": "" });
      if ( type.value === "basic" ) return {}; // Basic facilities do nothing.
      return { order: "maintain" }; // Special facilities are considered to have been issued the maintain order.
    }

    const newProgress = Math.min(progress.value + duration, progress.max);

    // Case 2 - Order incomplete. Ongoing progress.
    if ( newProgress < progress.max ) {
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
      else if ( trade.pending.value !== null && !trade.pending.creatures.length ) {
        updates["system.trade.stock.value"] = Math.min(trade.stock.value + trade.pending.value, trade.stock.max);
      }
    } else if ( trade.pending.value !== null ) {
      // See OrderActivity#_finalizeTrade for creatures TODO
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
   * Handle clicking action elements in chat cards.
   * @param {PointerEvent} event     The triggering event.
   * @param {HTMLElement} target     The action element.
   * @param {ChatMessage5e} message  The chat message.
   */
  #onChatAction(event, target, message) {
    const { action } = target.dataset;
    switch ( action ) {
      case "claim": this.#onClaimGold(message); break;
      case "viewItem": this.#onViewItem(target); break;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle claiming gold from a bastion turn summary message.
   * @param {ChatMessage5e} message  The message
   * @returns {Promise<ChatMessage5e>}
   */
  async #onClaimGold(message) {
    const results = message.getFlag("dnd5e", "bastion");
    const { gold } = results;
    const actor = message.getAssociatedActor();
    const { gp } = actor?.system?.currency ?? {};
    if ( !gold?.value || gold.claimed || (gp === undefined) ) return;
    await actor.update({ "system.currency.gp": gp + gold.value });
    gold.claimed = true;
    const content = await this.#renderSummary(actor, results);
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
    event.dataTransfer.setData("text/plain", JSON.stringify({ data: game.items.fromCompendium(item), type: "Item" }));
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
   * Render a chat card summary for the bastion turn results.
   * @param {Actor5e} actor                                     The actor whose turn it was.
   * @param {object} results
   * @param {BastionTurnItem[]} results.items                   The items produced during the turn.
   * @param {{ value: number, claimed: boolean }} results.gold  Gold generated during the turn.
   * @param {{ id: string, order: string }[]} results.orders    Orders completed during the turn.
   * @returns {Promise<string>}
   */
  async #renderSummary(actor, results) {
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
    return renderTemplate(this.constructor.SUMMARY_TEMPLATE, context);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Confirm the bastion turn should be advanced.
   * @returns {Promise<void>}
   */
  async confirmAdvance() {
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

    if ( !enabled || !button ) {
      turnButton?.remove();
      return;
    }

    if ( !turnButton ) {
      document.getElementById("controls")?.insertAdjacentHTML("afterend", `
        <button type="button" id="bastion-turn" data-action="bastionTurn" class="dnd5e2">
          <i class="fas fa-chess-rook"></i>
          <span>${game.i18n.localize("DND5E.Bastion.Action.BastionTurn")}</span>
        </button>
      `);
      document.getElementById("bastion-turn")?.addEventListener("click", this.confirmAdvance.bind(this));
    }
  }
}
