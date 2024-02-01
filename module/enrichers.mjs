import { formatNumber, simplifyBonus } from "./utils.mjs";
import Award from "./applications/award.mjs";
import { damageRoll } from "./dice/_module.mjs";
import * as Trait from "./documents/actor/trait.mjs";

const MAX_EMBED_DEPTH = 5;

const slugify = value => value?.slugify().replaceAll("-", "");

/**
 * Set up custom text enrichers.
 */
export function registerCustomEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/(?<type>award|check|damage|save|skill|tool|item) (?<config>[^\]]+)]](?:{(?<label>[^}]+)})?/gi,
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
    case "damage": return enrichDamage(config, label, options);
    case "check":
    case "skill":
    case "tool": return enrichCheck(config, label, options);
    case "save": return enrichSave(config, label, options);
    case "item": return enrichItem(config, label);
    case "embed": return enrichEmbed(config, label, options);
    case "reference": return enrichReference(config, label, options);
  }
  return null;
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
      case "rule": return embedTextPage(config, label, options);
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
/*  Enrichers                                   */
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

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  if ( invalid ) return null;

  const type = config.skill ? "skill" : config.tool ? "tool" : "check";
  config = { type, ...config };
  if ( !label ) label = createRollLabel(config);
  return config.passive ? createPassiveTag(label, config) : createRollLink(label, config);
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
    type: game.i18n.localize(CONFIG.DND5E.damageTypes[config.damageType]?.label ?? "").toLowerCase()
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
  let source;
  const type = Object.keys(config).find(k => k in CONFIG.DND5E.ruleTypes);
  if ( type ) {
    const key = slugify(config[type]);
    source = foundry.utils.getProperty(CONFIG.DND5E, CONFIG.DND5E.ruleTypes[type].references)?.[key];
  } else if ( config.values.length ) {
    const key = slugify(config.values.join(""));
    for ( const { references } of Object.values(CONFIG.DND5E.ruleTypes) ) {
      source = foundry.utils.getProperty(CONFIG.DND5E, references)[key];
      if ( source ) break;
    }
  }
  if ( !source ) {
    console.warn(`No valid rule found while enriching ${config._input}.`);
    return null;
  }
  const uuid = foundry.utils.getType(source) === "Object" ? source.reference : source;
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
    console.warn(`Ability ${config.ability} not found while enriching ${config._input}.`);
    return null;
  }
  if ( abilityConfig?.key ) config.ability = abilityConfig.key;

  if ( config.dc && !Number.isNumeric(config.dc) ) config.dc = simplifyBonus(config.dc, options.rollData ?? {});

  config = { type: "save", ...config };
  if ( !label ) label = createRollLabel(config);
  return createRollLink(label, config);
}

/* -------------------------------------------- */

/**
 * Enrich an item use link to roll an item on the selected token.
 * @param {string[]} config            Configuration data.
 * @param {string} [label]             Optional label to replace default text.
 * @returns {HTMLElement|null}         An HTML link if the item link could be built, otherwise null.
 *
 * @example Use an item from a Name:
 * ```[[/item Heavy Crossbow]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Heavy Crossbow
 * </a>
 * ```
 *
 * @example Use an Item from a UUID:
 * ```[[/item Actor.M4eX4Mu5IHCr3TMf.Item.amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 *
 * @example Use an Item from a "Name UUID":
 * ```[[/item Actor.Akra (Dragonborn Cleric).Item.Mace]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Mace
 * </a>
 * ```
 *
 * @example Use an Item from a Relative UUID:
 * ```[[/item .amUUCouL69OK1GZU]]```
 * becomes
 * ```html
 * <a class="roll-action" data-type="item">
 *   <i class="fa-solid fa-dice-d20"></i> Bite
 * </a>
 * ```
 */
async function enrichItem(config, label) {
  const givenItem = config.values.join(" ");
  // If config is a UUID
  const itemUuidMatch = givenItem.match(/^Actor\..*?\.Item\..*?$/);
  if (itemUuidMatch) {
    const actorIdOrName = itemUuidMatch[0].split(".")[1];
    const ownerActor = game.actors.get(actorIdOrName) || game.actors.getName(actorIdOrName);
    if (ownerActor) {
      const itemIdOrName = itemUuidMatch[0].split(".")[3];
      const ownedItem = ownerActor.items.get(itemIdOrName) || ownerActor.items.getName(itemIdOrName);
      if (!ownedItem) {
        console.warn(`Item ${itemIdOrName} not found while enriching ${config.input}.`);
        return config.input;
      } else if ( !label ) {
        label = ownedItem.name;
      }
      return createRollLink(label, {type: "item", rollItemActor: ownerActor.id, rollItemId: ownedItem.id });
    }
  }

  // If config is a relative ID
  const relativeIdMatch = givenItem.match(/^\.\w{16}$/);
  const copiedIdMatch = givenItem.match(/^\w{16}$/);
  const relativeNameMatch = givenItem.startsWith(".");
  if (relativeIdMatch || copiedIdMatch || relativeNameMatch) {
    const relativeId = relativeIdMatch ? givenItem.substr(1) : givenItem;
    const foundActor = game.actors.find(actor => actor.items.get(relativeId));
    if (foundActor) {
      const foundItem = foundActor.items.get(relativeId);
      if ( !label ) {
        label = foundItem.name;
        console.log(`Found actor ${foundActor.name} that owns the item ${foundItem.name}.`);
      }
      return createRollLink(label, { type: "item", rollRelativeItemId: relativeId });
    } else if (relativeNameMatch) {
      const relativeName = givenItem.substr(1);
      if (!label) {
        label = relativeName;
        return createRollLink(label, { type: "item", rollRelativeItemName: relativeName });
      }
    }
  }

  // Finally, if config is an item name
  if ( !label ) {
    label = givenItem;}
  return createRollLink(label, { type: "item", rollItemName: givenItem });
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
    if ( !["_config", "_input", "values"].includes(key) && value ) element.dataset[key] = value;
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
 * @param {object} config  Enrichment configuration data.
 * @returns {string}
 */
function createRollLabel(config) {
  const ability = CONFIG.DND5E.abilities[config.ability]?.label;
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
    case "save":
      label = ability;
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
  if ( game.user.isGM && (dataset.type !== "damage" && dataset.type !== "item") ) {
    const gmLink = document.createElement("a");
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
 * Forward clicks on award requests to the Award application.
 * @param {Event} event  The click event triggering the action.
 * @returns {Promise|void}
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
 * @returns {Promise|void}
 */
async function rollAction(event) {
  const target = event.target.closest('.roll-link, [data-action="rollRequest"]');
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
      // Fetch the actor that should perform the roll
      let actor;
      const speaker = ChatMessage.implementation.getSpeaker();
      if ( speaker.token ) actor = game.actors.tokens[speaker.token];
      actor ??= game.actors.get(speaker.actor);

      if ( !actor && (type !== "damage" && type !== "item") ) {
        ui.notifications.warn(game.i18n.localize("EDITOR.DND5E.Inline.NoActorWarning"));
        return;
      }

      switch ( type ) {
        case "check":
          return await actor.rollAbilityTest(ability, options);
        case "damage":
          return await rollDamage(event, speaker);
        case "save":
          return await actor.rollAbilitySave(ability, options);
        case "skill":
          if ( ability ) options.ability = ability;
          return await actor.rollSkill(skill, options);
        case "tool":
          options.ability = ability;
          return await actor.rollToolCheck(tool, options);
        case "item":
          // UUID Method
          if (target.dataset.rollItemActor) {
            const gameActor = game.actors.get(target.dataset.rollItemActor);
            if (gameActor.testUserPermission(game.user, "OWNER")) {
              return gameActor.items.get(target.dataset.rollItemId).use();
            } else {
              return ui.notifications.warn(`You do not have ownership of ${gameActor.name}, and cannot use this item!`);
            }

          // Relative Id Method
          } else if (target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName) {
            let locatedToken; let locatedScene; let locatedActor;
            const targetLocation = target.parentElement.parentElement;
            if (target.offsetParent.className == "message-content") {
              const chatCardIds = target.offsetParent.lastElementChild.dataset;
              if (chatCardIds.tokenId) {
                const chatIds = chatCardIds.tokenId.match(/Scene\.(.{16}).Token\.(.{16})/);
                locatedScene = chatIds[1];
                locatedToken = chatIds[2];
              } else {
                locatedActor = chatCardIds.actorId;
              }

            } else if (targetLocation.classList.contains("item-summary")) {
              const actorSheetIds = target.closest(".app.window-app.dnd5e.sheet.actor").id.match(/ActorSheet5e(?:NPC|Character)-(Scene-(.{16}))?(-Token-(.{16}))?(-Actor-(.{16}))?/);
              if (actorSheetIds[2]) {
                locatedScene = actorSheetIds[2];
                locatedToken = actorSheetIds[4];
              } else {
                locatedActor = event.target.offsetParent.id.slice(-16);
              }

            } else if (targetLocation.classList.contains("description")) {
              console.log("TOOLTIPPIES", targetLocation.parentElement)
              const actorSheet2Ids = ui.activeWindow._element[0].id.match(/ActorSheet5e(?:NPC|Character2)-(Scene-(.{16}))?(-Token-(.{16}))?(-Actor-(.{16}))?/);;
              console.log("ACTOR SHEET 2", actorSheet2Ids)
              if (actorSheet2Ids[2]) {
                locatedScene = actorSheet2Ids[2];
                locatedToken = actorSheet2Ids[4];
              } else {
                locatedActor = ui.activeWindow.object.id;
              }

            } else if (targetLocation.classList.contains("editor-content")) {
              const itemSheetIds = target.closest(".app.window-app.dnd5e.sheet.item").id.match(/ItemSheet5e-(Scene-(.{16}))?(-Token-(.{16}))?(Actor-(.{16}))?/);
              if (itemSheetIds[2]) {
                locatedScene = itemSheetIds[2];
                locatedToken = itemSheetIds[4];
              } else {
                locatedActor = itemSheetIds[6];
              }
            }

            if (locatedActor) {
              const gameActor = game.actors.get(locatedActor);
              const actorItem = gameActor.items.get(target.dataset.rollRelativeItemId) || gameActor.items.getName(target.dataset.rollRelativeItemName);
              if (actorItem) {
                if (gameActor.testUserPermission(game.user, "OWNER")) {
                  return actorItem.use();
                } else {
                  return ui.notifications.warn(`You do not have ownership of ${gameActor.name}, and cannot use this item!`);
                }
              }
              else return ui.notifications.warn(`Item ${target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName} not found on Actor ${gameActor.name}!`);
            } else {
              const parentScene = game.scenes.get(locatedScene);
              const sceneToken = parentScene.collections.tokens.get(locatedToken);
              const tokenItem = sceneToken.delta.collections.items.get(target.dataset.rollRelativeItemId) || sceneToken.delta.collections.items.getName(target.dataset.rollRelativeItemName);
              if (tokenItem) {
                if (sceneToken.actor.testUserPermission(game.user, "OWNER")) {
                  return tokenItem.use();
                } else {
                  return ui.notifications.warn(`You do not have ownership of ${sceneToken.name}, and cannot use this item!`);
                }
              }
              else return ui.notifications.warn(`Item ${target.dataset.rollRelativeItemId || target.dataset.rollRelativeItemName} not found on Token ${sceneToken.name} in Scene ${parentScene.name}!`);
            }

          // Name Method
          } else if (target.dataset.rollItemName) {
            return dnd5e.documents.macro.rollItem(target.dataset.rollItemName);
          }
        default:
          return console.warn(`D&D 5e | Unknown roll type ${type} provided.`);
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
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: await renderTemplate("systems/dnd5e/templates/chat/request-card.hbs", {
        buttonLabel: createRollLabel({ ...target.dataset, format: "short", icon: true }),
        hiddenLabel: createRollLabel({ ...target.dataset, format: "short", icon: true, hideDC: true }),
        dataset: { ...target.dataset, action: "rollRequest" }
      }),
      flavor: game.i18n.localize("EDITOR.DND5E.Inline.RollRequest"),
      speaker: MessageClass.getSpeaker({user: game.user})
    };
    return MessageClass.create(chatData);
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
    rollConfigs: [{
      parts: [formula],
      type: damageType
    }],
    flavor: `${title} (${game.i18n.localize(CONFIG.DND5E.damageTypes[damageType]?.label ?? damageType)})`,
    event,
    title,
    messageData
  };

  if ( Hooks.call("dnd5e.preRollDamage", undefined, rollConfig) === false ) return;
  const roll = await damageRoll(rollConfig);
  if ( roll ) Hooks.callAll("dnd5e.rollDamage", undefined, roll);
}
