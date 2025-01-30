import { formatNumber, getSceneTargets, simplifyBonus } from "./utils.mjs";
import Award from "./applications/award.mjs";
import JournalSpellListPageSheet from "./applications/journal/spells-page-sheet.mjs";
import { damageRoll } from "./dice/_module.mjs";
import * as Trait from "./documents/actor/trait.mjs";
import Item5e from "./documents/item.mjs";
import { rollItem } from "./documents/macro.mjs";

const slugify = value => value?.slugify().replaceAll("-", "");

/**
 * Set up custom text enrichers.
 */
export function registerCustomEnrichers() {
  const stringNames = ["award", "check", "concentration", "damage", "healing", "item", "save", "skill", "tool"];
  CONFIG.TextEditor.enrichers.push({
    pattern: new RegExp(`\\[\\[/(?<type>${stringNames.join("|")}) (?<config>[^\\]]+)]](?:{(?<label>[^}]+)})?`, "gi"),
    enricher: enrichString
  },
  {
    pattern: /\[\[(?<type>lookup) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
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

  document.body.addEventListener("click", applyAction);
  document.body.addEventListener("click", awardAction);
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
  config._input = match[0];
  switch ( type.toLowerCase() ) {
    case "award": return enrichAward(config, label, options);
    case "healing": config._isHealing = true;
    case "damage": return enrichDamage(config, label, options);
    case "check":
    case "skill":
    case "tool": return enrichCheck(config, label, options);
    case "lookup": return enrichLookup(config, label, options);
    case "concentration": config._isConcentration = true;
    case "save": return enrichSave(config, label, options);
    case "embed": return enrichEmbed(config, label, options);
    case "item": return enrichItem(config, label, options);
    case "reference": return enrichReference(config, label, options);
  }
  return null;
}

/* -------------------------------------------- */

/**
 * Parse a roll string into a configuration object.
 * @param {string} match  Matched configuration string.
 * @returns {object}
 */
function parseConfig(match) {
  const config = { _config: match, values: [] };
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
/*  Award Enricher                              */
/* -------------------------------------------- */

/**
 * Enrich an award block displaying amounts for each part granted with a GM-control for awarding to the party.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link if the check could be built, otherwise null.
 */
async function enrichAward(config, label, options) {
  const command = config._config;
  let parsed;
  try {
    parsed = Award.parseAwardCommand(command);
  } catch(err) {
    console.warn(err.message);
    return null;
  }

  const block = document.createElement("span");
  block.classList.add("award-block", "dnd5e2");
  block.dataset.awardCommand = command;

  const entries = [];
  for ( let [key, amount] of Object.entries(parsed.currency) ) {
    const label = CONFIG.DND5E.currencies[key].label;
    amount = Number.isNumeric(amount) ? formatNumber(amount) : amount;
    entries.push(`
      <span class="award-entry">
        ${amount} <i class="currency ${key}" data-tooltip="${label}" aria-label="${label}"></i>
      </span>
    `);
  }
  if ( parsed.xp ) entries.push(`
    <span class="award-entry">
      ${formatNumber(parsed.xp)} ${game.i18n.localize("DND5E.ExperiencePointsAbbr")}
    </span>
  `);

  let award = game.i18n.getListFormatter({ type: "unit" }).format(entries);
  if ( parsed.each ) award = game.i18n.format("EDITOR.DND5E.Inline.AwardEach", { award });

  block.innerHTML += `
    ${award}
    <a class="award-link" data-action="awardRequest">
      <i class="fa-solid fa-trophy"></i> ${label ?? game.i18n.localize("DND5E.Award.Action")}
    </a>
  `;

  return block;
}

/* -------------------------------------------- */
/*  Check & Save Enrichers                      */
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
  for ( let value of config.values ) {
    value = foundry.utils.getType(value) === "string" ? slugify(value) : value;
    if ( value in CONFIG.DND5E.enrichmentLookup.abilities ) config.ability = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.skills ) config.skill = value;
    else if ( value in CONFIG.DND5E.enrichmentLookup.tools ) config.tool = value;
    else if ( Number.isNumeric(value) ) config.dc = Number(value);
    else config[value] = true;
  }

  let invalid = false;

  const skillConfig = CONFIG.DND5E.enrichmentLookup.skills[slugify(config.skill)];
  if ( config.skill && !skillConfig ) {
    console.warn(`Skill ${config.skill} not found while enriching ${config._input}.`);
    invalid = true;
  } else if ( config.skill && !config.ability ) {
    config.ability = skillConfig.ability;
  }
  if ( skillConfig?.key ) config.skill = skillConfig.key;

  const toolUUID = CONFIG.DND5E.enrichmentLookup.tools[slugify(config.tool)];
  const toolIndex = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true }) : null;
  if ( config.tool && !toolIndex ) {
    console.warn(`Tool ${config.tool} not found while enriching ${config._input}.`);
    invalid = true;
  }

  let abilityConfig = CONFIG.DND5E.enrichmentLookup.abilities[slugify(config.ability)];
  if ( config.ability && !abilityConfig ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config._input}.`);
    invalid = true;
  } else if ( !abilityConfig ) {
    console.warn(`No ability provided while enriching check ${config._input}.`);
    invalid = true;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData);

  if ( invalid ) return null;

  const type = config.skill ? "skill" : config.tool ? "tool" : "check";
  config = { type, ...config };
  if ( !label ) label = createRollLabel(config);
  return config.passive ? createPassiveTag(label, config) : createRollLink(label, config);
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
 *
 * @example Create a concentration check:
 * ```[[/concentration 10]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="concentration" data-dc="10">
 *   <i class="fa-solid fa-dice-d20"></i> DC 10 concentration
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
  if ( !abilityConfig && !config._isConcentration ) {
    console.warn(`Ability ${config.ability} not found while enriching ${config._input}.`);
    return null;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData);

  config = { type: config._isConcentration ? "concentration" : "save", ...config };
  if ( !label ) label = createRollLabel(config);
  return createRollLink(label, config);
}

/* -------------------------------------------- */
/*  Damage Enricher                             */
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
 *
 * @example Create a healing link:
 * ```[[/healing 2d6]]``` or ```[[/damage 2d6 healing]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="damage" data-formula="2d6" data-damage-type="healing">
 *   <i class="fa-solid fa-dice-d20"></i> 2d6
 * </a> healing
 * ```
 */
async function enrichDamage(config, label, options) {
  const formulaParts = [];
  if ( config.formula ) formulaParts.push(config.formula);
  for ( const value of config.values ) {
    if ( value in CONFIG.DND5E.damageTypes ) config.type = value;
    else if ( value in CONFIG.DND5E.healingTypes ) config.type = value;
    else if ( value === "average" ) config.average = true;
    else if ( value === "temp" ) config.type = "temphp";
    else formulaParts.push(value);
  }
  config.formula = Roll.defaultImplementation.replaceFormulaData(formulaParts.join(" "), options.rollData ?? {});
  if ( !config.formula ) return null;
  config.damageType = config.type ?? (config._isHealing ? "healing" : null);
  config.type = "damage";

  if ( label ) return createRollLink(label, config);

  const typeConfig = CONFIG.DND5E.damageTypes[config.damageType] ?? CONFIG.DND5E.healingTypes[config.damageType];
  const localizationData = {
    formula: createRollLink(config.formula, config).outerHTML,
    type: game.i18n.localize(typeConfig?.label ?? "").toLowerCase()
  };

  let localizationType = "Short";
  if ( config.average ) {
    localizationType = "Long";
    if ( config.average === true ) {
      const minRoll = Roll.create(config.formula).evaluate({ minimize: true, async: true });
      const maxRoll = Roll.create(config.formula).evaluate({ maximize: true, async: true });
      localizationData.average = Math.floor(((await minRoll).total + (await maxRoll).total) / 2);
    } else if ( Number.isNumeric(config.average) ) {
      localizationData.average = config.average;
    }
  }

  const span = document.createElement("span");
  span.innerHTML = game.i18n.format(`EDITOR.DND5E.Inline.Damage${localizationType}`, localizationData);
  return span;
}

/* -------------------------------------------- */
/*  Embed Enrichers                             */
/* -------------------------------------------- */

const MAX_EMBED_DEPTH = 5;

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
      `Embed enrichers are restricted to ${MAX_EMBED_DEPTH} levels deep. ${config._input} cannot be enriched fully.`
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
      case "text":
      case "map":
      case "rule": return embedTextPage(config, label, options);
      case "spells": return embedSpellList(config, label, options);
    }
  }
  else if ( config.doc instanceof RollTable ) return embedRollTable(config, label, options);
  else if ( (config.doc instanceof Actor) || (config.doc instanceof Item) ) {
    return embedDocument(config, label, options);
  }
  return null;
}

/* -------------------------------------------- */

/**
 * Embed an Actor or Item document with a description.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace the default caption.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML figure containing the image, caption from the image page or a custom
 *                                     caption, and a link to the source if it could be built, otherwise null.
 */
async function embedDocument(config, label, options) {
  options = { ...options, _embedDepth: options._embedDepth + 1, relativeTo: config.doc };
  config.inline ??= config.values.includes("inline");

  const keyPath = (config.doc instanceof Actor) ? "system.details.biography.value"
    : game.user.isGM || (config.doc.system.identified !== false)
      ? "system.description.value"
      : "system.unidentified.description";
  const description = foundry.utils.getProperty(config.doc, keyPath);
  if ( description === undefined ) return null;

  const enriched = await TextEditor.enrichHTML(description, options);
  return wrapEmbeddedText(enriched, config, label, options);
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
    if ( showCite ) {
      const citeLink = config.doc.toAnchor();
      if ( game.release.generation < 12 ) citeLink.setAttribute("draggable", true);
      figcaption.innerHTML += `<cite>${citeLink.outerHTML}</cite>`;
    }
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
  return wrapEmbeddedText(enrichedPage, config, label, options);
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
 * Embed a spell list.
 * @param {object} config              Configuration data.
 * @param {string} label               Optional label to use as the table caption.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement|null>}
 */
async function embedSpellList(config, label, options) {
  for ( const value of config.values ) {
    if ( value === "table" ) config.table = true;
    else if ( value in JournalSpellListPageSheet.GROUPING_MODES ) config.grouping = value;
  }
  if ( config.table ) config.grouping = "level";

  const sheet = new JournalSpellListPageSheet(config.doc, {
    editable: false, displayAsTable: config.table, embedRendering: true, grouping: config.grouping
  });
  const rendered = await sheet._renderInner(await sheet.getData());
  config.classes = `spells ${config.classes ?? ""}`;
  return wrapEmbeddedText(rendered[0].innerHTML, config, label, options);
}

/* -------------------------------------------- */

/**
 * Wrap embeds in containing elements.
 * @param {string} enriched            Enriched text content to include.
 * @param {object} config              Configuration data.
 * @param {string} label               Optional label to replace the default caption.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement>}
 */
function wrapEmbeddedText(enriched, config, label, options) {
  if ( config.inline ) {
    const section = document.createElement("section");
    if ( config.classes ) section.className = config.classes;
    section.classList.add("content-embed");
    section.innerHTML = enriched;
    return section;
  }

  const showCaption = config.caption !== false;
  const showCite = config.cite !== false;
  const caption = label || config.doc.name;
  const figure = document.createElement("figure");
  figure.innerHTML = enriched;

  if ( config.classes ) figure.className = config.classes;
  figure.classList.add("content-embed");
  if ( showCaption || showCite ) {
    const figcaption = document.createElement("figcaption");
    if ( showCaption ) figcaption.innerHTML += `<strong class="embed-caption">${caption}</strong>`;
    if ( showCite ) {
      const citeLink = config.doc.toAnchor();
      if ( game.release.generation < 12 ) citeLink.setAttribute("draggable", true);
      figcaption.innerHTML += `<cite>${citeLink.outerHTML}</cite>`;
    }
    figure.insertAdjacentElement("beforeend", figcaption);
  }

  return figure;
}

/* -------------------------------------------- */
/*  Lookup Enricher                             */
/* -------------------------------------------- */

/**
 * Enrich a property lookup.
 * @param {object} config              Configuration data.
 * @param {string} [fallback]          Optional fallback if the value couldn't be found.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML element if the lookup could be built, otherwise null.
 *
 * @example Include a creature's name in its description:
 * ```[[lookup @name]]``
 * becomes
 * ```html
 * <span class="lookup-value">Adult Black Dragon</span>
 * ```
 */
function enrichLookup(config, fallback, options) {
  let keyPath = config.path;
  let style = config.style;
  for ( const value of config.values ) {
    if ( value === "capitalize" ) style ??= "capitalize";
    else if ( value === "lowercase" ) style ??= "lowercase";
    else if ( value === "uppercase" ) style ??= "uppercase";
    else if ( value.startsWith("@") ) keyPath ??= value;
  }

  if ( !keyPath ) {
    console.warn(`Lookup path must be defined to enrich ${config._input}.`);
    return null;
  }

  const data = options.relativeTo?.getRollData();
  let value = foundry.utils.getProperty(data, keyPath.substring(1)) ?? fallback;
  if ( value && style ) {
    if ( style === "capitalize" ) value = value.capitalize();
    else if ( style === "lowercase" ) value = value.toLowerCase();
    else if ( style === "uppercase" ) value = value.toUpperCase();
  }

  const span = document.createElement("span");
  span.classList.add("lookup-value");
  if ( !value ) span.classList.add("not-found");
  span.innerText = value ?? keyPath;
  return span;
}

/* -------------------------------------------- */
/*  Reference Enricher                          */
/* -------------------------------------------- */

/**
 * Enrich a reference link.
 * @param {object} config              Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {HTMLElement|null}         An HTML link to the Journal Entry Page for the given reference.
 *
 * @example Create a content link to the relevant reference:
 * ```&Reference[condition=unconscious]{Label}```
 * becomes
 * ```html
 * <span class="reference-link">
 *   <a class="content-link" draggable="true"
 *      data-uuid="Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.UWw13ISmMxDzmwbd"
 *      data-type="JournalEntryPage" data-tooltip="Text Page">
 *     <i class="fas fa-book-open"></i> Label
 *   </a>
 *   <a class="enricher-action" data-action="apply" data-status="unconscious"
 *      data-tooltip="EDITOR.DND5E.Inline.ApplyStatus" aria-label="Apply Status to Selected Tokens">
 *     <i class="fas fa-fw fa-reply-all fa-flip-horizontal"></i>
 *   </a>
 * </span>
 * ```
 */
async function enrichReference(config, label, options) {
  let key;
  let source;
  let isCondition = "condition" in config;
  const type = Object.keys(config).find(k => k in CONFIG.DND5E.ruleTypes);
  if ( type ) {
    key = slugify(config[type]);
    source = foundry.utils.getProperty(CONFIG.DND5E, CONFIG.DND5E.ruleTypes[type].references)?.[key];
  } else if ( config.values.length ) {
    key = slugify(config.values.join(""));
    for ( const [type, { references }] of Object.entries(CONFIG.DND5E.ruleTypes) ) {
      source = foundry.utils.getProperty(CONFIG.DND5E, references)[key];
      if ( source ) {
        if ( type === "condition" ) isCondition = true;
        break;
      }
    }
  }
  if ( !source ) {
    console.warn(`No valid rule found while enriching ${config._input}.`);
    return null;
  }
  const uuid = foundry.utils.getType(source) === "Object" ? source.reference : source;
  if ( !uuid ) return null;
  const doc = await fromUuid(uuid);
  const span = document.createElement("span");
  span.classList.add("reference-link");
  span.append(doc.toAnchor({ name: label || doc.name }));
  if ( isCondition && (config.apply !== false) ) {
    const apply = document.createElement("a");
    apply.classList.add("enricher-action");
    apply.dataset.action = "apply";
    apply.dataset.status = key;
    apply.dataset.tooltip = "EDITOR.DND5E.Inline.ApplyStatus";
    apply.setAttribute("aria-label", game.i18n.localize(apply.dataset.tooltip));
    apply.innerHTML = '<i class="fas fa-fw fa-reply-all fa-flip-horizontal"></i>';
    span.append(apply);
  }
  return span;
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

/**
 * Enrich an item use link to roll an item on the selected token.
 * @param {string[]} config              Configuration data.
 * @param {string} [label]               Optional label to replace default text.
 * @param {EnrichmentOptions} options  Options provided to customize text enrichment.
 * @returns {Promise<HTMLElement|null>}  An HTML link if the item link could be built, otherwise null.
 *
 * @example Use an item from a Name:
 * ```[[/item Heavy Crossbow]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item" data-roll-item-name="Heavy Crossbow">
 *   <i class="fa-solid fa-dice-d20"></i> Heavy Crossbow
 * </a>
 * ```
 *
 * @example Use an Item from a UUID:
 * ```[[/item Actor.M4eX4Mu5IHCr3TMf.Item.amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item" data-roll-item-uuid="Actor.M4eX4Mu5IHCr3TMf.Item.amUUCouL69OK1GZU">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 *
 * @example Use an Item from an ID:
 * ```[[/item amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item" data-roll-item-uuid="Actor.M4eX4Mu5IHCr3TMf.Item.amUUCouL69OK1GZU">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 */
async function enrichItem(config, label, options) {
  const givenItem = config.values.join(" ");
  // If config is a UUID
  const itemUuidMatch = givenItem.match(
    /^(?<synthid>Scene\.\w{16}\.Token\.\w{16}\.)?(?<actorid>Actor\.\w{16})(?<itemid>\.?Item(?<relativeId>\.\w{16}))$/
  );
  if ( itemUuidMatch ) {
    const ownerActor = itemUuidMatch.groups.actorid.trim();
    if ( !label ) {
      const item = await fromUuid(givenItem);
      if ( !item ) {
        console.warn(`Item not found while enriching ${givenItem}.`);
        return null;
      }
      label = item.name;
    }
    return createRollLink(label, { type: "item", rollItemActor: ownerActor, rollItemUuid: givenItem });
  }

  let foundItem;
  const foundActor = options.relativeTo instanceof Item
    ? options.relativeTo.parent
    : options.relativeTo instanceof Actor ? options.relativeTo : null;

  // If config is an Item ID
  if ( /^\w{16}$/.test(givenItem) && foundActor ) foundItem = foundActor.items.get(givenItem);

  // If config is a relative UUID
  if ( givenItem.startsWith(".") ) {
    try {
      foundItem = await fromUuid(givenItem, { relative: options.relativeTo });
    } catch { return null; }
  }

  if ( foundItem ) {
    if ( !label ) label = foundItem.name;
    return createRollLink(label, { type: "item", rollItemUuid: foundItem.uuid });
  }

  // Finally, if config is an item name
  if ( !label ) label = givenItem;
  return createRollLink(label, { type: "item", rollItemActor: foundActor?.uuid, rollItemName: givenItem });
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
    if ( !key.startsWith("_") && (key !== "values") && value ) element.dataset[key] = value;
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
  _addDataset(span, {
    ...dataset,
    tooltip: `
      <section class="loading" data-passive><i class="fas fa-spinner fa-spin-pulse"></i></section>
    `
  });
  span.innerText = label;
  return span;
}

/* -------------------------------------------- */

/**
 * Create a label for a roll message.
 * @param {object} config  Configuration data.
 * @returns {string}
 */
export function createRollLabel(config) {
  const { label: ability, abbreviation } = CONFIG.DND5E.abilities[config.ability] ?? {};
  const skill = CONFIG.DND5E.skills[config.skill]?.label;
  const toolUUID = CONFIG.DND5E.enrichmentLookup.tools[config.tool];
  const tool = toolUUID ? Trait.getBaseItem(toolUUID, { indexOnly: true })?.name : null;
  const longSuffix = config.format === "long" ? "Long" : "Short";
  const showDC = config.dc && !config.hideDC;

  let label;
  switch ( config.type ) {
    case "check":
    case "skill":
    case "tool":
      if ( ability && (skill || tool) ) {
        label = game.i18n.format("EDITOR.DND5E.Inline.SpecificCheck", { ability, type: skill ?? tool });
      } else {
        label = ability;
      }
      if ( config.passive ) {
        label = game.i18n.format(`EDITOR.DND5E.Inline.DCPassive${longSuffix}`, { dc: config.dc, check: label });
      } else {
        if ( showDC ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
        label = game.i18n.format(`EDITOR.DND5E.Inline.Check${longSuffix}`, { check: label });
      }
      break;
    case "concentration":
    case "save":
      if ( config.type === "save" ) label = ability;
      else label = `${game.i18n.localize("DND5E.Concentration")} ${ability ? `(${abbreviation})` : ""}`;
      if ( showDC ) label = game.i18n.format("EDITOR.DND5E.Inline.DC", { dc: config.dc, check: label });
      label = game.i18n.format(`EDITOR.DND5E.Inline.Save${longSuffix}`, { save: label });
      break;
    default:
      return "";
  }

  if ( config.icon ) {
    switch ( config.type ) {
      case "check":
      case "skill":
        label = `<i class="dnd5e-icon" data-src="systems/dnd5e/icons/svg/ability-score-improvement.svg"></i>${label}`;
        break;
      case "tool":
        label = `<i class="fas fa-hammer"></i>${label}`;
        break;
      case "concentration":
      case "save":
        label = `<i class="fas fa-shield-heart"></i>${label}`;
        break;
    }
  }

  return label;
}

/* -------------------------------------------- */

/**
 * Create a rollable link.
 * @param {string} label    Label to display.
 * @param {object} dataset  Data that will be added to the link for the rolling method.
 * @returns {HTMLElement}
 */
function createRollLink(label, dataset) {
  const span = document.createElement("span");
  span.classList.add("roll-link");
  _addDataset(span, dataset);

  // Add main link
  const link = document.createElement("a");
  link.dataset.action = "roll";
  link.innerHTML = `<i class="fa-solid fa-dice-d20"></i>${label}`;
  span.insertAdjacentElement("afterbegin", link);

  // Add chat request link for GMs
  if ( game.user.isGM && (dataset.type !== "damage") && (dataset.type !== "item") ) {
    const gmLink = document.createElement("a");
    gmLink.classList.add("enricher-action");
    gmLink.dataset.action = "request";
    gmLink.dataset.tooltip = "EDITOR.DND5E.Inline.RequestRoll";
    gmLink.setAttribute("aria-label", game.i18n.localize(gmLink.dataset.tooltip));
    gmLink.innerHTML = '<i class="fa-solid fa-comment-dots"></i>';
    span.insertAdjacentElement("beforeend", gmLink);
  }

  return span;
}

/* -------------------------------------------- */
/*  Actions                                     */
/* -------------------------------------------- */

/**
 * Toggle status effects on selected tokens.
 * @param {PointerEvent} event  The triggering event.
 * @returns {Promise<void>}
 */
async function applyAction(event) {
  const target = event.target.closest('[data-action="apply"][data-status]');
  const status = target?.dataset.status;
  const effect = CONFIG.statusEffects.find(e => e.id === status);
  if ( !effect ) return;
  event.stopPropagation();

  let duration;
  if (event.shiftKey) {
    const {DialogV2} = foundry.applications.api;

    const selectDurationGroup = new foundry.data.fields.NumberField({
      label: "Duration in s",
      required: true,
      min: 1,
      integer: true,
      nullable: true,
      initial: null
    }).toFormGroup({}, {name: "duration"}).outerHTML;

    const result = await DialogV2.prompt({
      window: {
        title: `${effect.name} Duration`
      },
      content: selectDurationGroup,
      modal: true,
      rejectClose: false,
      ok: {
        label: "Ok",
        callback: (event, button) => new FormDataExtended(button.form).object
      }
    });

    if (result?.duration > 0) duration = result.duration;
  }

  for ( const token of canvas.tokens.controlled ) {
    await token.actor.toggleStatusEffect(effect.id, {chosenDuration: duration});
  }
}

/* -------------------------------------------- */

/**
 * Forward clicks on award requests to the Award application.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise<void>}
 */
async function awardAction(event) {
  const target = event.target.closest('[data-action="awardRequest"]');
  const command = target?.closest("[data-award-command]")?.dataset.awardCommand;
  if ( !command ) return;
  event.stopPropagation();
  Award.handleAward(command);
}

/* -------------------------------------------- */

/**
 * Perform the provided roll action.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise}
 */
async function rollAction(event) {
  const target = event.target.closest('.roll-link, [data-action="rollRequest"], [data-action="concentration"]');
  if ( !target ) return;
  event.stopPropagation();

  const { type, ability, skill, tool, dc } = target.dataset;
  const options = { event };
  if ( dc ) options.targetValue = dc;

  const action = event.target.closest("a")?.dataset.action ?? "roll";

  // Direct roll
  if ( (action === "roll") || !game.user.isGM ) {
    target.disabled = true;
    try {
      switch ( type ) {
        case "damage": return await rollDamage(event);
        case "item": return await useItem(target.dataset);
      }

      const tokens = getSceneTargets();
      if ( !tokens.length ) {
        ui.notifications.warn("EDITOR.DND5E.Inline.Warning.NoActor", { localize: true });
        return;
      }

      for ( const token of tokens ) {
        const actor = token.actor;
        switch ( type ) {
          case "check":
            await actor.rollAbilityTest(ability, options);
            break;
          case "concentration":
            if ( ability in CONFIG.DND5E.abilities ) options.ability = ability;
            await actor.rollConcentration(options);
            break;
          case "save":
            await actor.rollAbilitySave(ability, options);
            break;
          case "skill":
            if ( ability ) options.ability = ability;
            await actor.rollSkill(skill, options);
            break;
          case "tool":
            options.ability = ability;
            await actor.rollToolCheck(tool, options);
            break;
        }
      }
    } finally {
      target.disabled = false;
    }
  }

  // Roll request
  else {
    const MessageClass = getDocumentClass("ChatMessage");
    const chatData = {
      user: game.user.id,
      content: await renderTemplate("systems/dnd5e/templates/chat/request-card.hbs", {
        buttonLabel: createRollLabel({ ...target.dataset, format: "short", icon: true }),
        hiddenLabel: createRollLabel({ ...target.dataset, format: "short", icon: true, hideDC: true }),
        dataset: { ...target.dataset, action: "rollRequest" }
      }),
      flavor: game.i18n.localize("EDITOR.DND5E.Inline.RollRequest"),
      speaker: MessageClass.getSpeaker({user: game.user})
    };
    // TODO: Remove when v11 support is dropped.
    if ( game.release.generation < 12 ) chatData.type = CONST.CHAT_MESSAGE_TYPES.OTHER;
    return MessageClass.create(chatData);
  }
}

/* -------------------------------------------- */

/**
 * Perform a damage roll.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise<void>}
 */
async function rollDamage(event) {
  const target = event.target.closest(".roll-link");
  const { formula, damageType } = target.dataset;

  const isHealing = damageType in CONFIG.DND5E.healingTypes;
  const title = game.i18n.localize(`DND5E.${isHealing ? "Healing" : "Damage"}Roll`);
  const rollConfig = {
    rollConfigs: [{
      parts: [formula],
      type: damageType
    }],
    flavor: title,
    event,
    title,
    messageData: {
      "flags.dnd5e": {
        targets: Item5e._formatAttackTargets(),
        roll: {type: "damage"}
      },
      speaker: ChatMessage.implementation.getSpeaker()
    }
  };

  if ( Hooks.call("dnd5e.preRollDamage", undefined, rollConfig) === false ) return;
  const roll = await damageRoll(rollConfig);
  if ( roll ) Hooks.callAll("dnd5e.rollDamage", undefined, roll);
}

/* -------------------------------------------- */

/**
 * Use an Item from an Item enricher.
 * @param {object} [options]
 * @param {string} [options.rollItemUuid]   Lookup the Item by UUID.
 * @param {string} [options.rollItemName]   Lookup the Item by name.
 * @param {string} [options.rollItemActor]  The UUID of a specific Actor that should use the Item.
 * @returns {Promise}
 */
async function useItem({ rollItemUuid, rollItemName, rollItemActor }={}) {
  // If UUID is provided, always roll that item directly
  if ( rollItemUuid ) return (await fromUuid(rollItemUuid))?.use();

  if ( !rollItemName ) return;
  const actor = rollItemActor ? await fromUuid(rollItemActor) : null;

  // If no actor is specified or player isn't owner, fall back to the macro rolling logic
  if ( !actor?.isOwner ) return rollItem(rollItemName);
  const token = canvas.tokens.controlled[0];

  // If a token is controlled, and it has an item with the correct name, activate it
  let item = token?.actor.items.getName(rollItemName);

  // Otherwise check the specified actor for the item
  if ( !item ) {
    item = actor.items.getName(rollItemName);

    // Display a warning to indicate the item wasn't rolled from the controlled actor
    if ( item && canvas.tokens.controlled.length ) ui.notifications.warn(
      game.i18n.format("MACRO.5eMissingTargetWarn", {
        actor: token.name, name: rollItemName, type: game.i18n.localize("DOCUMENT.Item")
      })
    );
  }

  if ( item ) return item.use();

  // If no item could be found at all, display a warning
  ui.notifications.warn(game.i18n.format("EDITOR.DND5E.Inline.Warning.NoItemOnActor", {
    actor: actor.name, name: rollItemName, type: game.i18n.localize("DOCUMENT.Item")
  }));
}
