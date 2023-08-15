/**
 * Override the core method for obtaining a Roll instance used for the Combatant.
 * @see {Actor5e#getInitiativeRoll}
 * @param {string} [formula]  A formula to use if no Actor is defined
 * @returns {D20Roll}         The D20Roll instance which is used to determine initiative for the Combatant
 */
export function getInitiativeRoll(formula="1d20") {
  if ( !this.actor ) return new CONFIG.Dice.D20Roll(formula ?? "1d20", {});
  return this.actor.getInitiativeRoll();
}

/**
 * An extension of the base Combat class to provide some 5e-specific functionality.
 * @extends {Combat}
 */
export default class Combat5e extends Combat {
  /** @inheritdoc */
  async _onStartTurn(combatant) {
    await this.resetLegendaryActions(combatant.actor);
    return super._onStartTurn(combatant);
  }

  /**
   * Reset the legendary actions of an npc-type actor.
   * @param {Actor5e} actor         The actor whose actions to reset.
   * @returns {Promise<Actor5e>}    The actor being updated, if applicable.
   */
  async resetLegendaryActions(actor) {
    if ( !actor || !this.active ) return;
    const leg = actor.system.resources?.legact ?? {};
    if ( actor.isOwner && !!leg.max && (leg.value < leg.max) ) {
      ui.notifications.info(game.i18n.format("DND5E.LegendaryActionReset", {name: actor.name}));
      return actor.update({"system.resources.legact.value": leg.max});
    }
  }
}
