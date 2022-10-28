/**
 * Override the default Initiative formula to customize special behaviors of the system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 * @returns {string}  Final initiative formula for the actor.
 * 
 */
export function _getInitiativeFormula() {
  const actor = this.actor;
  if ( !actor ) return "2d10";
  const init = actor.system.attributes.init;

  // Construct initiative formula parts
  let nd = 2;
  let mods = "";
  const parts = [
    `${nd}d10${mods}`,
    init.mod,
    (init.bonus !== 0) ? init.bonus : null
  ];

  /* TODO: Find out how to implement tiebreaker */

  return parts.filter(p => p !== null).join(" + ");
}
