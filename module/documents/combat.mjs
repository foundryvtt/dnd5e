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
  const rollData = actor.getRollData();

  // Construct initiative formula parts
  let nd = 1;
  let mods = "";
  const parts = [
    `${nd}d20${mods}`,
    init.mod,
    (init.prof.term !== "0") ? init.prof.term : null,
    (init.bonus !== 0) ? init.bonus : null
  ];

  // Ability Check Bonuses TODO: probably will need to revamp this
  const dexCheckBonus = actor.system.abilities.dex?.bonuses?.check;
  const globalCheckBonus = actor.system.bonuses?.abilities?.check;
  if ( dexCheckBonus ) parts.push(Roll.replaceFormulaData(dexCheckBonus, rollData));
  if ( globalCheckBonus ) parts.push(Roll.replaceFormulaData(globalCheckBonus, rollData));

  // Optionally apply Dexterity tiebreaker
  const tiebreaker = game.settings.get("shaper", "initiativeDexTiebreaker");
  if ( tiebreaker ) parts.push((actor.system.abilities.dex?.value ?? 0) / 100);
  return parts.filter(p => p !== null).join(" + ");
}
