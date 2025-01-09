/**
 * Extended version of Combat to trigger events on combat start & turn changes.
 */
export default class Combat5e extends Combat {

  /** @inheritDoc */
  async startCombat() {
    await super.startCombat();
    this._recoverUses({ encounter: true });
    return this;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if ( this.current.combatantId !== this.previous.combatantId ) {
      this.combatants.get(this.previous.combatantId)?.refreshDynamicRing();
      this.combatants.get(this.current.combatantId)?.refreshDynamicRing();
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    this.combatants.get(this.current.combatantId)?.refreshDynamicRing();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant);
    this._recoverUses({ turnEnd: combatant });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    this._recoverUses({ turnStart: combatant });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Reset combat specific uses.
   * @param {object} types  Which types of recovery to handle, and whether they should be performed on all combatants
   *                        or only the combatant specified.
   * @protected
   */
  async _recoverUses(types) {
    for ( const combatant of this.combatants ) {
      const periods = Object.entries(types).filter(([, v]) => (v === true) || (v === combatant)).map(([k]) => k);
      if ( periods.length ) await combatant.recoverCombatUses(periods);
    }
  }
}
