import { Actor5e } from "./actor/entity.js";

/* -------------------------------------------- */

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
  if ( CONFIG.initiative.tiebreaker ) parts.push(actor.data.data.abilities.dex.value / 100);
  return parts.filter(p => p !== null).join(" + ");
};

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {Array} options       The Array of Context Menu options
 *
 * @return {Array}              The extended options Array including new context choices
 */
export const addChatMessageContextOptions = function(html, options) {
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".dice-roll").length;
  options.push(
    {
      name: "Apply Damage",
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 1)
    },
    {
      name: "Apply Healing",
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, -1)
    },
    {
      name: "Double Damage",
      icon: '<i class="fas fa-user-injured"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 2)
    },
    {
      name: "Half Damage",
      icon: '<i class="fas fa-user-shield"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 0.5)
    }
  );
  return options;
};