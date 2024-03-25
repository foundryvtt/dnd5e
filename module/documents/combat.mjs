/**
 * Extended version of Combat to trigger events on combat start & turn changes.
 */
export default class Combat5e extends Combat {

  /** @inheritDoc */
  async startCombat() {
    await super.startCombat();
    this.combatant?.refreshDynamicRing();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async nextTurn() {
    const previous = this.combatant;
    await super.nextTurn();
    if ( previous && (previous !== this.combatant) ) previous.refreshDynamicRing();
    this.combatant.refreshDynamicRing();
    return this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async previousTurn() {
    const previous = this.combatant;
    await super.previousTurn();
    if ( previous && (previous !== this.combatant) ) previous.refreshDynamicRing();
    this.combatant.refreshDynamicRing();
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
}

