/**
 * Extended version of Combat to trigger events on combat start & turn changes.
 */
export default class Combat5e extends Combat {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Expansion state for groups within this combat.
   * @type {Set<string>}
   */
  expandedGroups = new Set();

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

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

  /** @override */
  _sortCombatants(a, b) {
    // Initiative takes top priority
    if ( a.initiative !== b.initiative ) return super._sortCombatants(a, b);

    // Separate out combatants with different base actors
    if ( !a.token?.baseActor || !b.token?.baseActor || (a.token?.baseActor !== b.token?.baseActor) ) {
      const name = c => `${c.token?.baseActor?.name ?? ""}.${c.token?.baseActor?.id ?? ""}`;
      return name(a).localeCompare(name(b), game.i18n.lang);
    }

    // Otherwise sort based on combatant name
    return a.name.localeCompare(b.name, game.i18n.lang);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine which group each combatant should be added to, or if a new group should be created.
   * @returns {Map<string, { combatants: Combatant5e[], expanded: boolean }>}
   */
  createGroups() {
    const groups = new Map();
    for ( const combatant of this.combatants ) {
      const key = combatant.getGroupingKey();
      if ( key === null ) continue;
      if ( !groups.has(key) ) groups.set(key, { combatants: [], expanded: this.expandedGroups.has(key) });
      groups.get(key).combatants.push(combatant);
    }

    for ( const [key, { combatants }] of groups.entries() ) {
      if ( combatants.length <= 1 ) groups.delete(key);
    }

    return groups;
  }

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
