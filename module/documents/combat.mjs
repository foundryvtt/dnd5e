/**
 * Override the default Initiative formula to customize special behaviors of the system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 * @returns {string}  Final initiative formula for the actor.
 * 
 * TODO: Modify this to fit the system
 */
export function _getInitiativeFormula() {
  const actor = this.actor;
  if ( !actor ) return "2d10";
  const init = actor.system.attributes.init;
  const fin = actor.system.abilities.fin;
  const sol = actor.system.abilities.sol;
  const rollData = actor.getRollData();

  // Construct initiative formula parts
  let nd = 2;
  let mods = "";
  const parts = [
    `${nd}d10${mods}`,
    fin.value,
    sol.value,
    init.mod,
    (init.bonus !== 0) ? init.bonus : null
  ];

  return parts.filter(p => p !== null).join(" + ");
}
