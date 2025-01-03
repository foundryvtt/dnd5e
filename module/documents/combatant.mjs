/**
 * @typedef {object} CombatRecoveryResults
 * @property {object} actor       Updates to be applied to the actor.
 * @property {object[]} item      Updates to be applied to the actor's items.
 * @property {BasicRoll[]} rolls  Any recovery rolls performed.
 */

/**
 * Custom combatant with custom initiative roll handling.
 */
export default class Combatant5e extends Combatant {
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
     * @param {Set<string>} periods            Periods that were recovered.
     * @param {CombatRecoveryResults} results  Updates that will be applied to the actor and its items.
     * @returns {boolean}  Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.combatRecovery", this, periods, results) === false ) return;

    if ( !foundry.utils.isEmpty(results.actor) ) await this.actor.update(results.actor);
    if ( results.item.length ) await this.actor.updateEmbeddedDocuments("Item", results.item);

    // TODO: Consider adding a chat message indicating what was recovered with a "Revert" button
    // Not sure if this should be GM-only or whispered to the owners of the actor

    /**
     * A hook event that fires after combat-related recovery changes have been applied.
     * @function dnd5e.postCombatRecovery
     * @memberof hookEvents
     * @param {Combatant5e} combatant  Combatant that is being recovered.
     * @param {Set<string>} periods    Periods that were recovered.
     */
    Hooks.callAll("dnd5e.postCombatRecovery", this, periods);
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
