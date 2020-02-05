
/**
 * Override the default Initiative formula to customize special behaviors of the D&D5e system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 */
export const _getInitiativeFormula = function(combatant) {
  const actor = combatant.actor;
  if ( !actor ) return "1d20";
  const init = actor.data.data.attributes.init;
  const parts = ["1d20", init.mod, (init.prof !== 0) ? init.prof : null, (init.bonus !== 0) ? init.bonus : null];
  if ( actor.getFlag("dnd5e", "initiativeAdv") ) parts[0] = "2d20kh";
  if ( CONFIG.Combat.initiative.tiebreaker ) parts.push(actor.data.data.abilities.dex.value / 100);
  return parts.filter(p => p !== null).join(" + ");
};
