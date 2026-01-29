import BastionAttackDialog from "../../applications/actor/bastion-attack-dialog.mjs";
import BastionAttackMessageData from "../../data/chat-message/bastion-attack-message-data.mjs";

/**
 * @import { BastionTurnResult } from "../_types.mjs";
 */

/**
 * A singleton class that manages global Bastion activity.
 */
export default class Bastion {

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
      await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor }),
        system: results,
        type: "bastionTurn"
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
  async resolveAttack(actor, formula, options={}) {
    const results = await BastionAttackMessageData.handleAttack(actor, formula, options);
    return (options.summary !== false ? results.system.deaths : results.deaths) ?? 0;
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
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
    const sizes = Object.entries(CONFIG.DND5E.facilities.sizes).sort(([, a], [, b]) => a.value - b.value);
    const index = Math.clamp(sizes.findIndex(([key]) => key === size), 0, sizes.length - 2);
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
    if ( formula ) return BastionAttackMessageData.handleAttack(actor, formula);
  }
}
