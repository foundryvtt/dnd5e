import ActorDeltasField from "../data/chat-message/fields/deltas-field.mjs";

/**
 * @typedef {import("../data/chat-message/fields/deltas-field.mjs").ActorDeltasData} ActorDeltasData
 */

/**
 * Custom combatant with custom initiative roll handling.
 */
export default class Combatant5e extends Combatant {
  /**
   * Create a chat message representing actor changes and displaying possible actions for this turn.
   * @param {object} [data={}]
   * @param {ActorDeltasData} [data.deltas]
   * @param {string[]} [data.periods]
   * @returns {ChatMessage5e|void}
   */
  async createTurnMessage({ deltas, periods }={}) {
    const messageConfig = {
      create: false,
      data: {
        speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.token }),
        system: {
          deltas, periods,
          origin: {
            combat: this.combat.id,
            combatant: this.id
          }
        },
        type: "turn",
        whisper: game.users.filter(u => this.actor.testUserPermission(game.user, "OWNER"))
      }
    };

    if ( !foundry.utils.isEmpty(messageConfig.data.system.deltas?.actor)
      || !foundry.utils.isEmpty(messageConfig.data.system.deltas?.item) ) messageConfig.create = true;
    // TODO: Also create message if actor has items with relevant activation type
    // when implementing https://github.com/foundryvtt/dnd5e/issues/4861

    /**
     * A hook event that fires before a combat state change chat message is created.
     * @function dnd5e.preCreateCombatMessage
     * @memberof hookEvents
     * @param {Combatant5e} combatant         Combatant for which the message will be created.
     * @param {object} messageConfig
     * @param {boolean} messageConfig.create  Should the chat message be posted?
     * @param {object} messageConfig.data     Data for the created chat message.
     */
    Hooks.callAll("dnd5e.preCreateCombatMessage", this, messageConfig);

    if ( messageConfig.create ) return ChatMessage.implementation.create(messageConfig.data);
  }

  /* -------------------------------------------- */

  /** @override */
  getInitiativeRoll(formula) {
    if ( !this.actor ) return new CONFIG.Dice.D20Roll(formula ?? "1d20", {});
    return this.actor.getInitiativeRoll();
  }

  /* -------------------------------------------- */

  /**
   * Reset combat-related uses.
   * @param {Set<string>} periods  Which recovery periods should be considered.
   */
  async recoverCombatUses(periods) {
    /**
     * A hook event that fires before combat-related recovery changes.
     * @function dnd5e.preCombatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant  Combatant that is being recovered.
     * @param {Set<string>} periods    Periods to be recovered.
     * @returns {boolean}              Explicitly return `false` to prevent recovery from being performed.
     */
    if ( Hooks.call("dnd5e.preCombatRecovery", this, periods) === false ) return;

    const updates = { actor: {}, item: [] };
    await this.actor?.system.recoverCombatUses?.(periods, updates);

    // TODO: If https://github.com/foundryvtt/dnd5e/issues/3214 is implemented, this is where
    // item/activity uses with combat related recovery can be recovered

    /**
     * A hook event that fires after combat-related recovery changes have been prepared, but before they have been
     * applied to the actor.
     * @function dnd5e.combatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant                      Combatant that is being recovered.
     * @param {Set<string>} periods                        Periods that were recovered.
     * @param {{ actor: object, item: object[] }} updates  Update that will be applied to the actor and its items.
     * @returns {boolean}  Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.combatRecovery", this, periods, updates) === false ) return;

    const deltas = ActorDeltasField.getDeltas(this.actor, updates);

    if ( !foundry.utils.isEmpty(updates.actor) ) await this.actor.update(updates.actor);
    if ( updates.item.length ) await this.actor.updateEmbeddedDocuments("Item", updates.item);

    const message = await this.createTurnMessage({ deltas, periods: Array.from(periods) });

    /**
     * A hook event that fires after combat-related recovery changes have been applied.
     * @function dnd5e.postCombatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant       Combatant that is being recovered.
     * @param {Set<string>} periods         Periods that were recovered.
     * @param {ChatMessage5e|void} message  Chat message created, if any.
     */
    Hooks.callAll("dnd5e.postCombatRecovery", this, periods, message);
  }

  /* -------------------------------------------- */

  /**
   * Trigger this combatant's dynamic token to refresh.
   */
  refreshDynamicRing() {
    if ( !this.token?.hasDynamicRing ) return;
    this.token.object?.renderFlags.set({ refreshRingVisuals: true });
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    requestAnimationFrame(() => this.refreshDynamicRing());
  }
}
