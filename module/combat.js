
/**
 * Override the default Initiative formula to customize special behaviors of the system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 */
export const _getInitiativeFormula = function(combatant) {
  const actor = combatant.actor;
  if ( !actor ) return "1d20";
  const init = actor.data.data.attributes.init;

  let nd = 1;
  let mods = "";
  
  if (actor.getFlag("dnd5e", "halflingLucky")) mods += "r=1";
  if (actor.getFlag("dnd5e", "initiativeAdv")) {
    nd = 2;
    mods += "kh";
  }

  const parts = [`${nd}d20${mods}`, init.mod, (init.prof !== 0) ? init.prof : null, (init.bonus !== 0) ? init.bonus : null];

  // Optionally apply Dexterity tiebreaker
  const tiebreaker = game.settings.get("dnd5e", "initiativeDexTiebreaker");
  if ( tiebreaker ) parts.push(actor.data.data.abilities.dex.value / 100);
  return parts.filter(p => p !== null).join(" + ");
};


/* -------------------------------------------- */


/**
 * TODO: A temporary shim until 0.7.x becomes stable
 * @override
 */
TokenConfig.getTrackedAttributes = function(data, _path=[]) {

    // Track the path and record found attributes
    const attributes = {
      "bar": [],
      "value": []
    };

    // Recursively explore the object
    for ( let [k, v] of Object.entries(data) ) {
      let p  = _path.concat([k]);

      // Check objects for both a "value" and a "max"
      if ( v instanceof Object ) {
        const isBar = ("value" in v) && ("max" in v);
        if ( isBar ) attributes.bar.push(p);
        else {
          const inner = this.getTrackedAttributes(data[k], p);
          attributes.bar.push(...inner.bar);
          attributes.value.push(...inner.value);
        }
      }

      // Otherwise identify values which are numeric or null
      else if ( Number.isNumeric(v) || (v === null) ) {
        attributes.value.push(p);
      }
    }
    return attributes;
};