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
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async endCombat() {
    await super.endCombat();
    this._recoverUses({ turn: true, turnEnd: true, turnStart: true });
    return this;
  }

  /* -------------------------------------------- */

  /** @override */
  async rollAll(options) {
    const ids = new Set();
    for ( let combatant of this.combatants ) {
      if ( combatant.group ) combatant = combatant.group.activeCombatant;
      if ( combatant.isOwner && (combatant.initiative === null) ) ids.add(combatant.id);
    }
    return this.rollInitiative(Array.from(ids), options);
  }

  /* -------------------------------------------- */

  /** @override */
  async rollNPC(options={}) {
    const ids = new Set();
    for ( let combatant of this.combatants ) {
      if ( combatant.group ) combatant = combatant.group.activeCombatant;
      if ( combatant.isOwner && combatant.isNPC && (combatant.initiative === null) ) ids.add(combatant.id);
    }
    return this.rollInitiative(Array.from(ids), options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async rollInitiative(ids, options={}) {
    await super.rollInitiative(ids, options);
    for ( const id of ids ) await this._recoverUses({ initiative: this.combatants.get(id) });
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
    // TODO: Workaround for https://github.com/foundryvtt/foundryvtt/issues/13495
    this.turn = null;
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
    this._recoverUses({ turn: true, turnStart: combatant });
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
      if ( combatant.isDefeated ) continue;
      const periods = Object.entries(types).filter(([, v]) => (v === true) || (v === combatant)).map(([k]) => k);
      if ( periods.length ) await combatant.recoverCombatUses(periods);
    }
  }
}
