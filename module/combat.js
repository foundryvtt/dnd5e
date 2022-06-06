/**
 * Override the default Initiative formula to customize special behaviors of the system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 * @returns {string}  Final initiative formula for the actor.
 */
export function _getInitiativeFormula() {
  if ( !this.actor ) return "1d20";
  const actorData = this.actor.data.data;
  const init = actorData.attributes.init;
  const rollData = this.actor.getRollData();

  // Construct initiative formula parts
  let nd = 1;
  let mods = "";
  if ( this.actor.getFlag("dnd5e", "halflingLucky") ) mods += "r1=1";
  if ( this.actor.getFlag("dnd5e", "initiativeAdv") ) {
    nd = 2;
    mods += "kh";
  }
  const parts = [
    `${nd}d20${mods}`,
    init.mod,
    (init.prof.term !== "0") ? init.prof.term : null,
    (init.bonus !== 0) ? init.bonus : null
  ];

  // Ability Check Bonuses
  const dexCheckBonus = actorData.abilities.dex?.bonuses?.check;
  const globalCheckBonus = actorData.bonuses?.abilities?.check;
  if ( dexCheckBonus ) parts.push(Roll.replaceFormulaData(dexCheckBonus, rollData));
  if ( globalCheckBonus ) parts.push(Roll.replaceFormulaData(globalCheckBonus, rollData));

  // Optionally apply Dexterity tiebreaker
  const tiebreaker = game.settings.get("dnd5e", "initiativeDexTiebreaker");
  if ( tiebreaker ) parts.push((actorData.abilities.dex?.value ?? 0) / 100);
  return parts.filter(p => p !== null).join(" + ");
}
