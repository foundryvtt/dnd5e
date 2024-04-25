/**
 * Custom combatant with custom initiative roll handling.
 */
export default class Combatant5e extends Combatant {
  /** @override */
  getInitiativeRoll(formula="1d20") {
    if ( !this.actor ) return new CONFIG.Dice.D20Roll(formula ?? "1d20", {});
    return this.actor.getInitiativeRoll();
  }

  /* -------------------------------------------- */

  /**
   * Trigger this combatant's dynamic token to refresh.
   */
  refreshDynamicRing() {
    if ( !this.token?.hasDynamicRing ) return;
    this.token.object.ring.configureVisuals(foundry.utils.deepClone(this.token.getFlag("dnd5e", "tokenRing") ?? {}));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    requestAnimationFrame(() => this.refreshDynamicRing());
  }
}
