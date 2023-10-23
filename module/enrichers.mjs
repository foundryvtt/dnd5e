import { simplifyBonus } from "./utils.mjs";
import * as Trait from "./documents/actor/trait.mjs";

/**
 * Set up the custom text enricher.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>check|save|skill|tool) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
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
  config = parseConfig(config, match.input);
  config.input = match.input;
  switch ( type.toLowerCase() ) {
    case "check":
    case "skill":
    case "tool": return enrichCheck(config, label, options);
    case "save": return enrichSave(config, label, options);
  }
  return match.input;
}

/* -------------------------------------------- */

/**
 * Parse a roll string into a configuration object.
 * @param {string} match  Matched configuration string.
 * @returns {object}
 */
function parseConfig(match) {
  const config = {};
  for ( const part of match.split(" ") ) {
    if ( !part ) continue;
    const [key, value] = part.split("=");
    const valueLower = value?.toLowerCase();
    if ( ["true", "false"].includes(valueLower) ) config[key] = valueLower === "true";
    else if ( Number.isNumeric(value) ) config[key] = Number(value);
    else config[key] = value ?? true;
  }
  return config;
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
 * @returns {HTMLElement|null}         An HTML link if the check could be built, otherwise null.
 *
 * @example Create a dexterity check:
 * ```[[/check ability=dex]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="dex">
 *   <i class="fa-solid fa-dice-d20"></i> Dexterity check
 * </a>
 * ```
 *
 * @example Create an acrobatics check with a DC and default ability:
 * ```[[/check skill=acr dc=20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-skill="acr" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity (Acrobatics) check
 * </a>
 * ```
 *
 * @example Create an acrobatics check using strength:
 * ```[[/check ability=str skill=acr]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="str" data-skill="acr">
 *   <i class="fa-solid fa-dice-d20"></i> Strength (Acrobatics) check
 * </a>
 * ```
 *
 * @example Create a tool check:
 * ```[[/check tool=thief ability=int]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="int" data-tool="thief">
 *   <i class="fa-solid fa-dice-d20"></i> Intelligence (Thieves' Tools) check
 * </a>
 * ```
 *
 * @example Formulas used for DCs will be resolved using data provided to the description (not the roller):
 * ```[[/check ability=cha dc=@abilities.int.dc]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="check" data-ability="cha" data-dc="15">
 *   <i class="fa-solid fa-dice-d20"></i> DC 15 Charisma check
 * </a>
 * ```
 */
export async function enrichCheck(config, label, options) {
  config = Object.entries(config).reduce((config, [k, v]) => {
    const bool = foundry.utils.getType(v) === "boolean";
    if ( bool && (k in CONFIG.DND5E.abilities) ) config.ability = k;
    else if ( bool && (k in CONFIG.DND5E.skills) ) config.skill = k;
    else if ( bool && (k in CONFIG.DND5E.toolIDs) ) config.tool = k;
    else if ( bool && Number.isNumeric(k) ) config.dc = Number(k);
    else config[k] = v;
    return config;
  }, {});

  let invalid = false;

  const skillConfig = CONFIG.DND5E.skills[config.skill];
  if ( config.skill && !skillConfig ) {
    console.warn(`Skill ${config.skill} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( config.skill && !config.ability ) {
    config.ability = skillConfig.ability;
  }

  const toolUUID = CONFIG.DND5E.toolIds[config.tool];
  const toolIndex = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true }) : null;
  if ( config.tool && !toolIndex ) {
    console.warn(`Tool ${config.tool} not found while enriching ${config.input}.`);
    invalid = true;
  }

  let abilityConfig = CONFIG.DND5E.abilities[config.ability];
  if ( config.ability && !abilityConfig ) {
    console.warn(`Ability ${ability} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( !abilityConfig ) {
    console.warn(`No ability provided while enriching check ${config.input}.`);
    invalid = true;
  }

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  if ( invalid ) return config.input;

  // Insert the icon and label into the link
  if ( !label ) {
    const ability = abilityConfig?.label;
    const skill = skillConfig?.label;
    const tool = toolIndex?.name;
    if ( ability && (skill || tool) ) {
      label = game.i18n.format("EDITOR.DND5E.Inline.SpecificCheck", { ability, type: skill ?? tool });
    } else {
      label = ability;
    }
    if ( config.dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
    label = game.i18n.format(`EDITOR.DND5E.Inline.Check${config.format === "long" ? "Long" : "Short"}`, {
      check: label
    });
  }

  const type = config.skill ? "skill" : config.tool ? "tool" : "check";
  return createRollLink(label, { type, ...config });
}

/* -------------------------------------------- */

/**
 * Enrich a saving throw link.
 * @param {string[]} config            Configuration data.
 * @param {string} label               Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the save could be built, otherwise null.
 *
 * @example Create a dexterity saving throw:
 * ```[[/save ability=dex]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex">
 *   <i class="fa-solid fa-dice-d20"></i> Dexterity
 * </a>
 * ```
 *
 * @example Add a DC to the save:
 * ```[[/save ability=dex dc=20]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="save" data-key="dex" data-dc="20">
 *   <i class="fa-solid fa-dice-d20"></i> DC 20 Dexterity
 * </a>
 * ```
 */
export async function enrichSave(config, label, options) {
  config = Object.entries(config).reduce((config, [k, v]) => {
    const bool = foundry.utils.getType(v) === "boolean";
    if ( bool && (k in CONFIG.DND5E.abilities) ) config.ability = k;
    else if ( bool && Number.isNumeric(k) ) config.dc = Number(k);
    else config[k] = v;
    return config;
  }, {});

  const abilityConfig = CONFIG.DND5E.abilities[config.ability];
  if ( !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config.input}.`);
    return config.input;
  }

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  if ( !label ) {
    label = abilityConfig.label;
    if ( config.dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
    label = game.i18n.format(`EDITOR.DND5E.Inline.Save${config.format === "long" ? "Long" : "Short"}`, {
      save: label
    });
  }

  return createRollLink(label, { type: "save", ...config });
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the link for the rolling method.
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

  const { type, ability, skill, tool, dc } = target.dataset;
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
    case "tool":
      options.ability = ability;
      return actor.rollToolCheck(tool, options);
    default:
      return console.warn(`DnD5e | Unknown roll type ${type} provided.`);
  }
}
