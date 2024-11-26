/**
 * Extended version of Combat to trigger events on combat start & turn changes.
 */
export default class Combat5e extends Combat {

  /** @inheritDoc */
  async startCombat() {
    await super.startCombat();
    this._recoverUses({ encounter: true });
    this.combatant?.refreshDynamicRing();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async nextTurn() {
    const previous = this.combatant;
    await super.nextTurn();
    this._recoverUses({ turnEnd: previous, turnStart: this.combatant });
    if ( previous && (previous !== this.combatant) ) previous.refreshDynamicRing();
    this.combatant?.refreshDynamicRing();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async previousTurn() {
    const previous = this.combatant;
    await super.previousTurn();
    if ( previous && (previous !== this.combatant) ) previous.refreshDynamicRing();
    this.combatant?.refreshDynamicRing();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async endCombat() {
    const previous = this.combatant;
    await super.endCombat();
    previous?.refreshDynamicRing();
    return this;
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
      if ( periods.length ) await combatant.recoverCombatUses(new Set(periods));
    }
  }
}
