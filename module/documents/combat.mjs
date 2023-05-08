/**
 * Override the core method for obtaining a Roll instance used for the Combatant.
 * @see {Actor5e#getInitiativeRoll}
 * @param {string} [formula]  A formula to use if no Actor is defined
 * @returns {D20Roll}         The D20Roll instance which is used to determine initiative for the Combatant
 */
export function getInitiativeRoll(formula="1d20") {
  if ( !this.actor ) return new CONFIG.Dice.D20Roll(formula, {});
  return this.actor.getInitiativeRoll();
}
