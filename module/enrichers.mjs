import { simplifyBonus } from "./utils.mjs";

/**
 * Set up the custom text enricher.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>check|save|skill) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  });

  document.body.addEventListener("click", rollAction);
}

/* -------------------------------------------- */

/**
 * Parse the enriched string and provide the appropriate content.
 * @param {RegExpMatchArray} match       The regular expression match result.
 * @param {EnrichmentOptions} options    Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement|null>}  An HTML element to insert in place of the matched text or null to
 *                                       indicate that no replacement should be made.
 */
export async function enrichString(match, options) {
  let { type, config, label } = match.groups;
  config = config.split(" ").map(c => c.trim());
  switch ( type.toLowerCase() ) {
    case "check":
    case "skill": return enrichCheck(config, label, options) ?? match.input;
    case "save": return enrichSave(config, label, options) ?? match.input;
  }
  return match.input;
}

/* -------------------------------------------- */
/*  Enrichers                                   */
/* -------------------------------------------- */

/**
 * Enrich an ability check link to perform a specific ability or skill check. If an ability is provided
 * along with a skill, then the skill check will always use the provided ability. Otherwise it will use
 * the character's default ability for that skill.
 * @param {string[]} config            Configuration data.
 * @param {string} label               Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         A HTML link if the check could be built, otherwise null.
 *
 * TODO: Add some examples
 */
export async function enrichCheck(config, label, options) {
  let ability;
  let skill;
  let dc;

  config.forEach(key => {
    if ( key in CONFIG.DND5E.abilities ) ability = key;
    else if ( key in CONFIG.DND5E.skills ) skill = key;
    else if ( Number.isNumeric(key) ) dc = parseInt(key);
    else dc = simplifyBonus(key, options.rollData ?? {});
  });

  let invalid = false;

  const abilityConfig = CONFIG.DND5E.abilities[ability];
  if ( ability && !abilityConfig ) {
    console.warn(`Ability ${ability} not found`);
    invalid = true;
  }

  const skillConfig = CONFIG.DND5E.skills[skill];
  if ( skill && !skillConfig ) {
    console.warn(`Skills ${skill} not found`);
    invalid = true;
  }

  if ( invalid || !(ability || skill) ) return null;

  // Insert the icon and label into the link
  if ( !label ) {
    const ability = abilityConfig?.label;
    const skill = skillConfig?.label;
    if ( ability && skill ) label = game.i18n.format("EDITOR.DND5E.Inline.Skill", { ability, skill });
    else if ( ability ) label = game.i18n.format("EDITOR.DND5E.Inline.Check", { type: ability });
    else if ( skill ) label = game.i18n.format("EDITOR.DND5E.Inline.Check", { type: skill });
    if ( dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: label });
  }

  const type = skillConfig ? "skill" : "check";
  return createRollLink(label, { type, ability, skill, dc });
}

/* -------------------------------------------- */

/**
 * Enrich a saving throw link.
 * @param {string[]} config            Configuration data.
 * @param {string} label               Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         A HTML link if the save could be built, otherwise null.
 *
 * @example Create a dexterity saving throw:
 * ```[[/save dex]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex">
 *   <i class="fa-solid fa-dice-d20"></i> Dexterity Save
 * </a>
 * ```
 *
 * @example Add a DC to the save:
 * ```[[/save dex 20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity Save
 * </a>
 * ```
 */
export async function enrichSave(config, label, options) {
  const ability = config.shift();
  const dc = simplifyBonus(config.shift(), options.rollData ?? {});

  const abilityConfig = CONFIG.DND5E.abilities[ability];
  if ( !abilityConfig ) {
    console.warn(`Ability ${ability} not found`);
    return null;
  }

  if ( !label ) {
    const ability = abilityConfig.label;
    label = game.i18n.format("EDITOR.DND5E.Inline.Save", { ability });
    if ( dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: label });
  }

  return createRollLink(label, { type: "save", ability, dc });
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label            Label to display.
 * @param {object} dataset
 * @param {string} dataset.type     Type of rolling action to perform (e.g. `check`, `save`, `skill`).
 * @param {string} dataset.ability  Ability key to roll (e.g. `dex`, `str`).
 * @param {string} dataset.skill    Skill key to roll (e.g. `ath`, `med`).
 * @param {number} dataset.dc       DC of the roll.
 * @returns {HTMLElement}
 */
export function createRollLink(label, dataset) {
  const link = document.createElement("a");
  link.classList.add("roll-link");
  for ( const [key, value] of Object.entries(dataset) ) {
    if ( value ) link.dataset[key] = value;
  }
  link.innerHTML = `<i class="fa-solid fa-dice-d20"></i> ${label}`;
  return link;
}

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * Perform the provided roll action.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise|void}
 */
export function rollAction(event) {
  const target = event.target.closest(".roll-link");
  if ( !target ) return;
  event.stopPropagation();

  const { type, ability, skill, dc } = target.dataset;
  const options = { event };
  if ( dc ) options.targetValue = dc;

  // Fetch the actor that should perform the roll
  let actor;
  const speaker = ChatMessage.implementation.getSpeaker();
  if ( speaker.token ) actor = game.actors.tokens[speaker.token];
  actor ??= game.actors.get(speaker.actor);
  if ( !actor ) {
    ui.notifications.warn(game.i18n.localize("EDITOR.DND5E.Inline.NoActorWarning"));
    return;
  }

  switch ( type ) {
    case "check":
      return actor.rollAbilityTest(ability, options);
    case "save":
      return actor.rollAbilitySave(ability, options);
    case "skill":
      if ( ability ) options.ability = ability;
      return actor.rollSkill(skill, options);
    default:
      return console.warn(`DnD5e | Unknown roll type ${type} provided.`);
  }
}
