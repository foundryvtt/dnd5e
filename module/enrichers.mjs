import { simplifyBonus } from "./utils.mjs";
import { damageRoll } from "./dice/_module.mjs";
import * as Trait from "./documents/actor/trait.mjs";

const MAX_EMBED_DEPTH = 5;

/**
 * Set up custom text enrichers.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>check|damage|save|skill|tool) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  },
  {
    pattern: /&(?<type>Reference)\[(?<config>[^\]]+)](?:{(?<label>[^}]+)})?/gi,
    enricher: enrichString
  },
  {
    // TODO: Remove when v11 support is dropped
    pattern: /@(?<type>Embed)\[(?<config>[^\]]+)](?:{(?<label>[^}]+)})?/gi,
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
async function enrichString(match, options) {
  let { type, config, label } = match.groups;
  config = parseConfig(config);
  config.input = match[0];
  switch ( type.toLowerCase() ) {
    case "damage": return enrichDamage(config, label, options);
    case "check":
    case "skill":
    case "tool": return enrichCheck(config, label, options);
    case "save": return enrichSave(config, label, options);
    case "embed": return enrichEmbed(config, label, options);
    case "reference": return enrichReference(config, label, options);
  }
  return match.input;
}

/* -------------------------------------------- */

/**
 * Parse the enriched embed and provide the appropriate content.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default caption/text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the check could be built, otherwise null.
 */
async function enrichEmbed(config, label, options) {
  options._embedDepth ??= 0;
  if ( options._embedDepth > MAX_EMBED_DEPTH ) {
    console.warn(
      `Embed enrichers are restricted to ${MAX_EMBED_DEPTH} levels deep. ${config.input} cannot be enriched fully.`
    );
    return null;
  }

  for ( const value of config.values ) {
    if ( config.uuid ) break;
    try {
      const parsed = foundry.utils.parseUuid(value);
      if ( parsed.documentId ) config.uuid = value;
    } catch(err) {}
  }

  config.doc = await fromUuid(config.uuid, { relative: options.relativeTo });
  if ( config.doc instanceof JournalEntryPage ) {
    switch ( config.doc.type ) {
      case "image": return embedImagePage(config, label, options);
      case "text": return embedTextPage(config, label, options);
    }
  }
  else if ( config.doc instanceof RollTable ) return embedRollTable(config, label, options);
  return null;
}

/* -------------------------------------------- */

/**
 * Parse a roll string into a configuration object.
 * @param {string} match  Matched configuration string.
 * @returns {object}
 */
function parseConfig(match) {
  const config = { values: [] };
  for ( const part of match.match(/(?:[^\s"]+|"[^"]*")+/g) ) {
    if ( !part ) continue;
    const [key, value] = part.split("=");
    const valueLower = value?.toLowerCase();
    if ( value === undefined ) config.values.push(key.replace(/(^"|"$)/g, ""));
    else if ( ["true", "false"].includes(valueLower) ) config[key] = valueLower === "true";
    else if ( Number.isNumeric(value) ) config[key] = Number(value);
    else config[key] = value.replace(/(^"|"$)/g, "");
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
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
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
async function enrichCheck(config, label, options) {
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.skills ) config.skill = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.tools ) config.tool = value;
    else if ( Number.isNumeric(value) ) config.dc = Number(value);
    else config[value] = true;
  }

  let invalid = false;

  const skillConfig = CONFIG.DND5E.enrichmentLookup.skills[config.skill];
  if ( config.skill && !skillConfig ) {
    console.warn(`Skill ${config.skill} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( config.skill && !config.ability ) {
    config.ability = skillConfig.ability;
  }
  if ( skillConfig?.key ) config.skill = skillConfig.key;

  const toolUUID = CONFIG.DND5E.enrichmentLookup.tools[config.tool];
  const toolIndex = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true }) : null;
  if ( config.tool && !toolIndex ) {
    console.warn(`Tool ${config.tool} not found while enriching ${config.input}.`);
    invalid = true;
  }

  let abilityConfig = CONFIG.DND5E.enrichmentLookup.abilities[config.ability];
  if ( config.ability && !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config.input}.`);
    invalid = true;
  } else if ( !abilityConfig ) {
    console.warn(`No ability provided while enriching check ${config.input}.`);
    invalid = true;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

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
    const longSuffix = config.format === "long" ? "Long" : "Short";
    if ( config.passive ) {
      label = game.i18n.format(`EDITOR.DND5E.Inline.DCPassive${longSuffix}`, { dc: config.dc, check: label });
    } else {
      if ( config.dc ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
      label = game.i18n.format(`EDITOR.DND5E.Inline.Check${longSuffix}`, { check: label });
    }
  }

  if ( config.passive ) return createPassiveTag(label, config);
  const type = config.skill ? "skill" : config.tool ? "tool" : "check";
  return createRollLink(label, { type, ...config });
}

/* -------------------------------------------- */

/**
 * Enrich a damage link.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the save could be built, otherwise null.
 *
 * @example Create a damage link:
 * ```[[/damage 2d6 type=bludgeoning]]``
 * becomes
 * ```html
 * <a class="roll-action" data-type="damage" data-formula="2d6" data-damage-type="bludgeoning">
 *   <i class="fa-solid fa-dice-d20"></i> 2d6
 * </a> bludgeoning
 * ````
 *
 * @example Display the average:
 * ```[[/damage 2d6 type=bludgeoning average=true]]``
 * becomes
 * ```html
 * 7 (<a class="roll-action" data-type="damage" data-formula="2d6" data-damage-type="bludgeoning">
 *   <i class="fa-solid fa-dice-d20"></i> 2d6
 * </a>) bludgeoning
 * ````
 *
 * @example Manually set the average & don't prefix the type:
 * ```[[/damage 8d4dl force average=666]]``
 * becomes
 * ```html
 * 666 (<a class="roll-action" data-type="damage" data-formula="8d4dl" data-damage-type="force">
 *   <i class="fa-solid fa-dice-d20"></i> 8d4dl
 * </a> force
 * ````
 */
async function enrichDamage(config, label, options) {
  const formulaParts = [];
  if ( config.formula ) formulaParts.push(config.formula);
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.damageTypes ) config.type = value;
    else if ( value === "average" ) config.average = true;
    else formulaParts.push(value);
  }
  config.formula = Roll.defaultImplementation.replaceFormulaData(formulaParts.join(" "), options.rollData ?? {});
  if ( !config.formula ) return null;
  config.damageType = config.type;
  config.type = "damage";

  if ( label ) return createRollLink(label, config);

  const localizationData = {
    formula: createRollLink(config.formula, config).outerHTML,
    type: game.i18n.localize(CONFIG.DND5E.damageTypes[config.damageType] ?? "").toLowerCase()
  };

  let localizationType = "Short";
  if ( config.average ) {
    localizationType = "Long";
    if ( config.average === true ) {
      const minRoll = Roll.create(config.formula).evaluate({ minimize: true, async: true });
      const maxRoll = Roll.create(config.formula).evaluate({ maximize: true, async: true });
      localizationData.average = Math.floor((await minRoll.total + await maxRoll.total) / 2);
    } else if ( Number.isNumeric(config.average) ) {
      localizationData.average = config.average;
    }
  }

  const span = document.createElement("span");
  span.innerHTML = game.i18n.format(`EDITOR.DND5E.Inline.Damage${localizationType}`, localizationData);
  return span;
}

/* -------------------------------------------- */

/**
 * Embed an image page.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace the default caption.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML figure containing the image, caption from the image page or a custom
 *                                     caption, and a link to the source if it could be built, otherwise null.
 *
 * @example Create an embedded image from the UUID of an Image Journal Entry Page:
 * ```@Embed[uuid=.QnH8yGIHy4pmFBHR classes="small right"]{A caption for the image}```
 * becomes
 * ```html
 * <figure class="small right content-embed">
 *   <img src="assets/image.png" alt="A caption for the image">
 *   <figcaption>
 *     <strong class="embed-caption">A caption for the image</strong>
 *     <cite>
 *       <a class="content-link" draggable="true"
 *          data-uuid="JournalEntry.xFNPjbSEDbWjILNj.JournalEntryPage.QnH8yGIHy4pmFBHR"
 *          data-id="QnH8yGIHy4pmFBHR" data-type="JournalEntryPage" data-tooltip="Image Page">
 *         <i class="fas fa-file-image"></i> Image Page
 *       </a>
 *     </cite>
 *   </figcaption>
 * </figure>
 * ```
 */
function embedImagePage(config, label, options) {
  const showCaption = config.caption !== false;
  const showCite = config.cite !== false;
  const caption = label || config.doc.image.caption || config.doc.name;

  const figure = document.createElement("figure");
  if ( config.classes ) figure.className = config.classes;
  figure.classList.add("content-embed");
  figure.innerHTML = `<img src="${config.doc.src}" alt="${config.alt || caption}">`;

  if ( showCaption || showCite ) {
    const figcaption = document.createElement("figcaption");
    if ( showCaption ) figcaption.innerHTML += `<strong class="embed-caption">${caption}</strong>`;
    if ( showCite ) figcaption.innerHTML += `<cite>${config.doc.toAnchor().outerHTML}</cite>`;
    figure.insertAdjacentElement("beforeend", figcaption);
  }
  return figure;
}

/* -------------------------------------------- */

/**
 * Embed a text page.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML element containing the content from the given page and a link to the
 *                                     source if it could be built, otherwise null.
 *
 * @example Embed the content of the Journal Entry Page with the given UUID:
 * ```@Embed[uuid=JournalEntry.xFNPjbSEDbWjILNj.JournalEntryPage.QnH8yGIHy4pmFBHR classes="small right"]```
 * becomes
 * ```html
 * <figure class="small right content-embed">
 *   <p>The contents of the page</p>
 *   <figcaption>
 *     <strong class="embed-caption">A caption for the text</strong>
 *     <cite>
 *       <a class="content-link" draggable="true"
 *          data-uuid="JournalEntry.ekAeXsvXvNL8rKFZ.JournalEntryPage.yDbDF1ThSfeinh3Y"
 *          data-id="yDbDF1ThSfeinh3Y" data-type="JournalEntryPage" data-tooltip="Text Page">
 *         <i class="fas fa-file-lines"></i> Text Page
 *       </a>
 *     </cite>
 *   <figcaption>
 * </figure>
 * ```
 */
async function embedTextPage(config, label, options) {
  options = { ...options, _embedDepth: options._embedDepth + 1, relativeTo: config.doc };
  config.inline ??= config.values.includes("inline");

  const enrichedPage = await TextEditor.enrichHTML(config.doc.text.content, options);
  if ( config.inline ) {
    const section = document.createElement("section");
    if ( config.classes ) section.className = config.classes;
    section.classList.add("content-embed");
    section.innerHTML = enrichedPage;
    return section;
  }

  const showCaption = config.caption !== false;
  const showCite = config.cite !== false;
  const caption = label || config.doc.name;
  const figure = document.createElement("figure");
  figure.innerHTML = enrichedPage;

  if ( config.classes ) figure.className = config.classes;
  figure.classList.add("content-embed");
  if ( showCaption || showCite ) {
    const figcaption = document.createElement("figcaption");
    if ( showCaption ) figcaption.innerHTML += `<strong class="embed-caption">${caption}</strong>`;
    if ( showCite ) figcaption.innerHTML += `<cite>${config.doc.toAnchor().outerHTML}</cite>`;
    figure.insertAdjacentElement("beforeend", figcaption);
  }

  return figure;
}

/* -------------------------------------------- */

/**
 * Embed a roll table.
 * @param {object} config              Configuration data.
 * @param {string} label               Optional label to use as the table caption.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement|null>}
 */
async function embedRollTable(config, label, options) {
  options = { ...options, _embedDepth: options._embedDepth + 1, relativeTo: config.doc };
  config.inline ??= config.values.includes("inline");
  const results = config.doc.results.toObject();
  results.sort((a, b) => a.range[0] - b.range[0]);
  const table = document.createElement("table");
  table.classList.add("roll-table-embed");
  table.innerHTML = `
    <thead>
      <tr>
        <th>${game.i18n.localize("TABLE.Roll")}</th>
        <th>${game.i18n.localize("Result")}</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const getDocAnchor = (doc, resultData) => {
    if ( doc ) return doc.toAnchor().outerHTML;

    // No doc found, create a broken anchor.
    return `<a class="content-link broken"><i class="fas fa-unlink"></i>${resultData.text || game.i18n.localize("Unknown")}</a>`;
  };

  const tbody = table.querySelector("tbody");
  for ( const data of results ) {
    const { range, type, text, documentCollection, documentId } = data;
    const row = document.createElement("tr");
    const [lo, hi] = range;
    row.innerHTML += `<td>${lo === hi ? lo : `${lo}&mdash;${hi}`}</td>`;
    let result;
    switch ( type ) {
      case CONST.TABLE_RESULT_TYPES.TEXT: result = await TextEditor.enrichHTML(text, options); break;
      case CONST.TABLE_RESULT_TYPES.DOCUMENT: {
        const doc = CONFIG[documentCollection]?.collection.instance?.get(documentId);
        result = getDocAnchor(doc, data);
        break;
      }
      case CONST.TABLE_RESULT_TYPES.COMPENDIUM: {
        const doc = await game.packs.get(documentCollection)?.getDocument(documentId);
        result = getDocAnchor(doc, data);
        break;
      }
    }

    row.innerHTML += `<td>${result}</td>`;
    tbody.append(row);
  }

  if ( config.inline ) {
    const section = document.createElement("section");
    if ( config.classes ) section.className = config.classes;
    section.classList.add("content-embed");
    section.append(table);
    return section;
  }

  const showCaption = config.caption !== false;
  const showCite = config.cite !== false;
  const figure = document.createElement("figure");
  figure.append(table);
  if ( config.classes ) figure.className = config.classes;
  figure.classList.add("content-embed");
  if ( showCaption || showCite ) {
    const figcaption = document.createElement("figcaption");
    if ( showCaption ) {
      if ( label ) figcaption.innerHTML += `<strong class="embed-caption">${label}</strong>`;
      else {
        const description = await TextEditor.enrichHTML(config.doc.description, options);
        const container = document.createElement("div");
        container.innerHTML = description;
        container.classList.add("embed-caption");
        figcaption.append(container);
      }
    }
    if ( showCite ) figcaption.innerHTML += `<cite>${config.doc.toAnchor().outerHTML}</cite>`;
    figure.append(figcaption);
  }
  return figure;
}

/* -------------------------------------------- */

/**
 * Enrich a reference link.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link to the Journal Entry Page for the given reference.
 *
 * @example Create a content link to the relevant reference:
 * ```@Reference[condition=unconscious]{Label}```
 * becomes
 * ```html
 * <a class="content-link" draggable="true"
 *    data-uuid="Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.UWw13ISmMxDzmwbd"
 *    data-type="JournalEntryPage" data-tooltip="Text Page">
 *   <i class="fas fa-file-lines"></i> Label
 * </a>
 * ```
 */
async function enrichReference(config, label, options) {
  const type = Object.keys(config).find(k => k in CONFIG.DND5E.ruleTypes);
  if ( !type ) {
    console.warn(`No valid rule type found while enriching ${config.input}.`);
    return null;
  }
  const uuid = CONFIG.DND5E[CONFIG.DND5E.ruleTypes[type].references]?.[config[type]]?.reference;
  if ( !uuid ) return null;
  const doc = await fromUuid(uuid);
  return doc.toAnchor({ name: label || doc.name });
}

/* -------------------------------------------- */

/**
 * Enrich a saving throw link.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
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
async function enrichSave(config, label, options) {
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = value;
    else if ( Number.isNumeric(value) ) config.dc = Number(value);
    else config[value] = true;
  }

  const abilityConfig = CONFIG.DND5E.enrichmentLookup.abilities[config.ability];
  if ( !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config.input}.`);
    return config.input;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

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
 * Add a dataset object to the provided element.
 * @param {HTMLElement} element  Element to modify.
 * @param {object} dataset       Data properties to add.
 * @private
 */
function _addDataset(element, dataset) {
  for ( const [key, value] of Object.entries(dataset) ) {
    if ( !["input", "values"].includes(key) && value ) element.dataset[key] = value;
  }
}

/* -------------------------------------------- */

/**
 * Create a passive skill tag.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the tag.
 * @returns {HTMLElement}
 */
function createPassiveTag(label, dataset) {
  const span = document.createElement("span");
  span.classList.add("passive-check");
  _addDataset(span, dataset);
  span.innerText = label;
  return span;
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the link for the rolling method.
 * @returns {HTMLElement}
 */
function createRollLink(label, dataset) {
  const link = document.createElement("a");
  link.classList.add("roll-link");
  _addDataset(link, dataset);
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
function rollAction(event) {
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
  if ( !actor && (type !== "damage") ) {
    ui.notifications.warn(game.i18n.localize("EDITOR.DND5E.Inline.NoActorWarning"));
    return;
  }

  switch ( type ) {
    case "check":
      return actor.rollAbilityTest(ability, options);
    case "damage":
      return rollDamage(event, speaker);
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

/* -------------------------------------------- */

/**
 * Perform a damage roll.
 * @param {Event} event              The click event triggering the action.
 * @param {TokenDocument} [speaker]  Currently selected token, if one exists.
 * @returns {Promise|void}
 */
async function rollDamage(event, speaker) {
  const target = event.target.closest(".roll-link");
  const { formula, damageType } = target.dataset;

  const title = game.i18n.localize("DND5E.DamageRoll");
  const messageData = { "flags.dnd5e.roll.type": "damage", speaker };
  const rollConfig = {
    parts: [formula],
    flavor: `${title} (${game.i18n.localize(CONFIG.DND5E.damageTypes[damageType] ?? damageType)})`,
    event,
    title,
    messageData
  };

  if ( Hooks.call("dnd5e.preRollDamage", undefined, rollConfig) === false ) return;
  const roll = await damageRoll(rollConfig);
  if ( roll ) Hooks.callAll("dnd5e.rollDamage", undefined, roll);
}
