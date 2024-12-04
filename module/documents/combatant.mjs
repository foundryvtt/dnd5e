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

    if ( !foundry.utils.isEmpty(updates.actor) ) await this.actor.update(updates.actor);
    if ( updates.item.length ) await this.actor.updateEmbeddedDocuments("Item", updates.item);

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
