import ActivationsField from "../data/chat-message/fields/activations-field.mjs";
import { ActorDeltasField } from "../data/chat-message/fields/deltas-field.mjs";

/**
 * @import { ActorDeltasData } from "../data/chat-message/fields/deltas-field.mjs";
 */

/**
 * @typedef CombatRecoveryResults
 * @property {object} actor       Updates to be applied to the actor.
 * @property {object[]} item      Updates to be applied to the actor's items.
 * @property {BasicRoll[]} rolls  Any recovery rolls performed.
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
   * @param {BasicRoll[]} [data.rolls]
   * @returns {ChatMessage5e|void}
   */
  async createTurnMessage({ deltas, periods, rolls }={}) {
    if ( !this.actor ) return;

    const messageConfig = {
      create: false,
      data: {
        rolls,
        speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.token }),
        system: {
          deltas, periods,
          activations: ActivationsField.getActivations(this.actor, periods),
          origin: {
            combat: this.combat.id,
            combatant: this.id
          }
        },
        type: "turn",
        whisper: game.users.filter(u => this.actor.testUserPermission(u, "OWNER"))
      }
    };

    if ( !foundry.utils.isEmpty(messageConfig.data.system.deltas?.actor)
      || !foundry.utils.isEmpty(messageConfig.data.system.deltas?.item)
      || !foundry.utils.isEmpty(messageConfig.data.system.activations) ) messageConfig.create = true;

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

  /**
   * Key for the group to which this combatant should belong, or `null` if it can't be grouped.
   * @returns {string|null}
   */
  getGroupingKey() {
    if ( this.group ) return this.group.id;
    if ( this.token?.actorLink || !this.token?.baseActor || (this.initiative === null) ) return null;
    return `${Math.floor(this.initiative).paddedString(4)}:${this.token.disposition}:${this.token.baseActor.id}`;
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
   * @param {string[]} periods  Which recovery periods should be considered.
   */
  async recoverCombatUses(periods) {
    /**
     * A hook event that fires before combat-related recovery changes.
     * @function dnd5e.preCombatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant  Combatant that is being recovered.
     * @param {string[]} periods       Periods to be recovered.
     * @returns {boolean}              Explicitly return `false` to prevent recovery from being performed.
     */
    if ( Hooks.call("dnd5e.preCombatRecovery", this, periods) === false ) return;

    const results = { actor: {}, item: [], rolls: [] };
    await this.actor?.system.recoverCombatUses?.(periods, results);

    for ( const item of this.actor?.items ?? [] ) {
      if ( foundry.utils.getType(item.system.recoverUses) !== "function" ) continue;
      const rollData = item.getRollData();
      const { updates, rolls } = await item.system.recoverUses(Array.from(periods), rollData);
      if ( !foundry.utils.isEmpty(updates) ) {
        const updateTarget = results.item.find(i => i._id === item.id);
        if ( updateTarget ) foundry.utils.mergeObject(updateTarget, updates);
        else results.item.push({ _id: item.id, ...updates });
      }
      results.rolls.push(...rolls);
    }

    /**
     * A hook event that fires after combat-related recovery changes have been prepared, but before they have been
     * applied to the actor.
     * @function dnd5e.combatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant          Combatant that is being recovered.
     * @param {string[]} periods               Periods that were recovered.
     * @param {CombatRecoveryResults} results  Update that will be applied to the actor and its items.
     * @returns {boolean}  Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.combatRecovery", this, periods, results) === false ) return;

    const deltas = ActorDeltasField.getDeltas(this.actor, results);

    if ( !foundry.utils.isEmpty(results.actor) ) await this.actor.update(results.actor);
    if ( results.item.length ) await this.actor.updateEmbeddedDocuments("Item", results.item);

    const message = await this.createTurnMessage({ deltas, periods, rolls: results.rolls });

    /**
     * A hook event that fires after combat-related recovery changes have been applied.
     * @function dnd5e.postCombatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant       Combatant that is being recovered.
     * @param {string[]} periods            Periods that were recovered.
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

  /* -------------------------------------------- */

  /** @inheritDoc */
  static async _onUpdateOperation(documents, operation, user) {
    await super._onUpdateOperation(documents, operation, user);
    if ( (user.id !== game.userId) || !operation.parent ) return;
    const updates = {};
    for ( let i = 0; i < operation.updates.length; i++ ) {
      const update = operation.updates[i];
      const combatant = documents[i];
      if ( combatant.group ) updates[combatant.group.id] = update.initiative;
    }
    if ( foundry.utils.isEmpty(updates) ) return;
    await operation.parent.updateEmbeddedDocuments("CombatantGroup", Object.entries(updates).map(([id, init]) => {
      return { _id: id, initiative: init };
    }));
    operation.parent.setupTurns();
    ui.combat.render();
  }
}
