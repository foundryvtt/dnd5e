/**
 * Set up the custom text enricher.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>check|save|skill) (?<config>[^\]]+)\]\](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  });

  document.querySelector("body").addEventListener("click", rollAction);
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
  switch (type.toLowerCase()) {
    case "check": return enrichCheck(config, label);
    case "save": return enrichSave(config, label);
    case "skill": return enrichSkill(config, label);
  }
  return match.input;
}

/* -------------------------------------------- */
/*  Enrichers                                   */
/* -------------------------------------------- */

/**
 * Enrich a ability check link to perform a specific ability or skill check.
 * @param {string[]} config     Configuration data.
 * @param {string} label        Optional label to replace default text.
 * @returns {HTMLElement|null}  A HTML link if the check could be built, otherwise null.
 *
 * TODO: Add some examples
 */
export async function enrichCheck(config, label) {
  const ability = config.shift();
  const skill = !Number.isNumeric(config[0]) ? config.shift() : null;
  const dc = Number.isNumeric(config[0]) ? parseInt(config.pop()) : null;

  const abilityConfig = CONFIG.DND5E.abilities[ability];
  if ( !abilityConfig ) return console.log(`Ability ${ability} not found`);

  const skillConfig = CONFIG.DND5E.skills[skill];
  if ( skill && !skillConfig ) return console.log(`Skills ${skill} not found`);

  // Insert the icon and label into the link
  if ( !label ) {
    const ability = abilityConfig.label;
    if ( skillConfig ) label = game.i18n.format("EDITOR.DND5E.Inline.Skill", { ability, skill: skillConfig.label });
    else label = game.i18n.format("EDITOR.DND5E.Inline.Check", { ability });
    if ( dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: label });
  }

  const type = skillConfig ? "skill" : "check";
  return createRollLink(label, { type, ability, skill, dc });
}

/* -------------------------------------------- */

/**
 * Enrich a ability save link.
 * @param {string[]} config     Configuration data.
 * @param {string} label        Optional label to replace default text.
 * @returns {HTMLElement|null}  A HTML link if the save could be built, otherwise null.
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
 * ```[[/dex 20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity Save
 * </a>
 * ```
 */
export async function enrichSave(config, label) {
  const ability = config.shift();
  const dc = Number.isNumeric(config[0]) ? parseInt(config.pop()) : null;

  const abilityConfig = CONFIG.DND5E.abilities[ability];
  if ( !abilityConfig ) return console.log(`Ability ${ability} not found`);

  if ( !label ) {
    const ability = abilityConfig.label;
    label = game.i18n.format("EDITOR.DND5E.Inline.Save", { ability });
    if ( dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: label });
  }

  return createRollLink(label, { type: "save", ability, dc });
}

/* -------------------------------------------- */

/**
 * Enrich a skill check link. Unlike the `@Check` enricher, this will use the player's default ability
 * or allow for selecting any associated ability to perform the skill check.
 * @param {string[]} config     Configuration data.
 * @param {string} label        Optional label to replace default text.
 * @returns {HTMLElement|null}  A HTML link if the save could be built, otherwise null.
 *
 * TODO: Add some examples
 */
export async function enrichSkill(config, label) {
  const skill = config.shift();
  const dc = Number.isNumeric(config[0]) ? parseInt(config.pop()) : null;

  const skillConfig = CONFIG.DND5E.skills[skill];
  if ( !skillConfig ) return console.log(`Skills ${skill} not found`);

  if ( !label ) {
    label = game.i18n.format("EDITOR.DND5E.Inline.Check", { ability: skillConfig.label });
    if ( dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc, check: label });
  }

  return createRollLink(label, { type: "skill", skill, dc });
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label  Label to display.
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
  let target = event.target;
  if ( !target.classList.contains("roll-link") ) target = target.closest(".roll-link");
  if ( !target ) return;
  event.stopPropagation();

  const { type, ability, skill, dc } = target.dataset;
  const options = {};
  if ( dc ) options.targetValue = dc;

  // Fetch the actor that should perform the roll
  let actor;
  const speaker = ChatMessage.getSpeaker();
  if ( speaker.token ) actor = game.actors.tokens[speaker.token];
  actor ??= game.actors.get(speaker.actor);
  if ( !actor ) return ui.notifications.warn(game.i18n.localize("EDITOR.DND5E.Inline.NoActorWarning"));

  switch (type) {
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
