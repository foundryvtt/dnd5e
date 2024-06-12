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
   * Trigger this combatant's dynamic token to refresh.
   */
  refreshDynamicRing() {
    if ( !this.token?.hasDynamicRing ) return;
    if ( game.release.generation < 12 ) {
      this.token.object?.ring.configureVisuals(foundry.utils.deepClone(this.token.getFlag("dnd5e", "tokenRing") ?? {}));
    } else this.token.object?.renderFlags.set({refreshRingVisuals: true});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    requestAnimationFrame(() => this.refreshDynamicRing());
  }
}
