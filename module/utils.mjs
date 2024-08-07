/* -------------------------------------------- */
/*  Formatters                                  */
/* -------------------------------------------- */

/**
 * Format a Challenge Rating using the proper fractional symbols.
 * @param {number} value  CR value for format.
 * @returns {string}
 */
export function formatCR(value) {
  return { 0.125: "⅛", 0.25: "¼", 0.5: "½" }[value] ?? formatNumber(value);
}

/* -------------------------------------------- */

/**
 * Format a modifier for display with its sign separate.
 * @param {number} mod  The modifier.
 * @returns {Handlebars.SafeString}
 */
export function formatModifier(mod) {
  if ( !Number.isFinite(mod) ) return new Handlebars.SafeString("");
  return new Handlebars.SafeString(`<span class="sign">${mod < 0 ? "-" : "+"}</span>${Math.abs(mod)}`);
}

/* -------------------------------------------- */

/**
 * A helper for using Intl.NumberFormat within handlebars.
 * @param {number} value    The value to format.
 * @param {object} options  Options forwarded to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat}
 * @returns {string}
 */
export function formatNumber(value, options) {
  const formatter = new Intl.NumberFormat(game.i18n.lang, options);
  return formatter.format(value);
}

/* -------------------------------------------- */

/**
 * A helper for using Intl.NumberFormat within handlebars for format a range.
 * @param {number} min      The lower end of the range.
 * @param {number} max      The upper end of the range.
 * @param {object} options  Options forwarded to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat}
 * @returns {string}
 */
export function formatRange(min, max, options) {
  const formatter = new Intl.NumberFormat(game.i18n.lang, options);
  return formatter.formatRange(min, max);
}

/* -------------------------------------------- */

/**
 * A helper function to format textarea text to HTML with linebreaks.
 * @param {string} value  The text to format.
 * @returns {Handlebars.SafeString}
 */
export function formatText(value) {
  return new Handlebars.SafeString(value?.replaceAll("\n", "<br>") ?? "");
}

/* -------------------------------------------- */
/*  Formulas                                    */
/* -------------------------------------------- */

/**
 * Return whether a string is a valid reroll, explosion, min, or max dice modifier.
 * @param {string} mod      The modifier to test.
 * @returns {boolean}
 */
export function isValidDieModifier(mod) {
  const regex = {
    reroll: /rr?([0-9]+)?([<>=]+)?([0-9]+)?/i,
    explode: /xo?([0-9]+)?([<>=]+)?([0-9]+)?/i,
    minimum: /(?:min)([0-9]+)/i,
    maximum: /(?:max)([0-9]+)/i,
    dropKeep: /[dk]([hl])?([0-9]+)?/i,
    count: /(?:c[sf])([<>=]+)?([0-9]+)?/i
  };
  return Object.values(regex).some(rgx => rgx.test(mod));
}

/* -------------------------------------------- */

/**
 * Handle a delta input for a number value from a form.
 * @param {HTMLInputElement} input  Input that contains the modified value.
 * @param {Document} target         Target document to be updated.
 * @returns {number|void}
 */
export function parseInputDelta(input, target) {
  let value = input.value;
  if ( ["+", "-"].includes(value[0]) ) {
    const delta = parseFloat(value);
    value = Number(foundry.utils.getProperty(target, input.dataset.name ?? input.name)) + delta;
  }
  else if ( value[0] === "=" ) value = Number(value.slice(1));
  if ( Number.isNaN(value) ) return;
  input.value = value;
  return value;
}

/* -------------------------------------------- */

/**
 * Replace referenced data attributes in the roll formula with values from the provided data.
 * If the attribute is not found in the provided data, display a warning on the actor.
 * @param {string} formula           The original formula within which to replace.
 * @param {object} data              The data object which provides replacements.
 * @param {object} [options={}]
 * @param {Actor5e} [options.actor]            Actor for which the value is being prepared.
 * @param {Item5e} [options.item]              Item for which the value is being prepared.
 * @param {string|null} [options.missing="0"]  Value to use when replacing missing references, or `null` to not replace.
 * @param {string} [options.property]          Name of the property to which this formula belongs.
 * @returns {string}                 Formula with replaced data.
 */
export function replaceFormulaData(formula, data, { actor, item, missing="0", property }={}) {
  const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
  const missingReferences = new Set();
  formula = String(formula).replace(dataRgx, (match, term) => {
    let value = foundry.utils.getProperty(data, term);
    if ( value == null ) {
      missingReferences.add(match);
      return missing ?? match[0];
    }
    return String(value).trim();
  });
  actor ??= item?.parent;
  if ( (missingReferences.size > 0) && actor && property ) {
    const listFormatter = new Intl.ListFormat(game.i18n.lang, { style: "long", type: "conjunction" });
    const message = game.i18n.format("DND5E.FormulaMissingReferenceWarn", {
      property, name: item?.name ?? actor.name, references: listFormatter.format(missingReferences)
    });
    actor._preparationWarnings.push({ message, link: item?.uuid ?? actor.uuid, type: "warning" });
  }
  return formula;
}

/* -------------------------------------------- */

/**
 * Convert a bonus value to a simple integer for displaying on the sheet.
 * @param {number|string|null} bonus  Bonus formula.
 * @param {object} [data={}]          Data to use for replacing @ strings.
 * @returns {number}                  Simplified bonus as an integer.
 * @protected
 */
export function simplifyBonus(bonus, data={}) {
  if ( !bonus ) return 0;
  if ( Number.isNumeric(bonus) ) return Number(bonus);
  try {
    const roll = new Roll(bonus, data);
    return roll.isDeterministic ? roll.evaluateSync().total : 0;
  } catch(error) {
    console.error(error);
    return 0;
  }
}

/* -------------------------------------------- */
/*  IDs                                         */
/* -------------------------------------------- */

/**
 * Create an ID from the input truncating or padding the value to make it reach 16 characters.
 * @param {string} id
 * @returns {string}
 */
export function staticID(id) {
  if ( id.length >= 16 ) return id.substring(0, 16);
  return id.padEnd(16, "0");
}

/* -------------------------------------------- */
/*  Object Helpers                              */
/* -------------------------------------------- */

/**
 * Transform an object, returning only the keys which match the provided filter.
 * @param {object} obj         Object to transform.
 * @param {Function} [filter]  Filtering function. If none is provided, it will just check for truthiness.
 * @returns {string[]}         Array of filtered keys.
 */
export function filteredKeys(obj, filter) {
  filter ??= e => e;
  return Object.entries(obj).filter(e => filter(e[1])).map(e => e[0]);
}

/* -------------------------------------------- */

/**
 * Sort the provided object by its values or by an inner sortKey.
 * @param {object} obj                 The object to sort.
 * @param {string|Function} [sortKey]  An inner key upon which to sort or sorting function.
 * @returns {object}                   A copy of the original object that has been sorted.
 */
export function sortObjectEntries(obj, sortKey) {
  let sorted = Object.entries(obj);
  const sort = (lhs, rhs) => foundry.utils.getType(lhs) === "string" ? lhs.localeCompare(rhs, game.i18n.lang) : lhs - rhs;
  if ( foundry.utils.getType(sortKey) === "function" ) sorted = sorted.sort((lhs, rhs) => sortKey(lhs[1], rhs[1]));
  else if ( sortKey ) sorted = sorted.sort((lhs, rhs) => sort(lhs[1][sortKey], rhs[1][sortKey]));
  else sorted = sorted.sort((lhs, rhs) => sort(lhs[1], rhs[1]));
  return Object.fromEntries(sorted);
}

/* -------------------------------------------- */

/**
 * Retrieve the indexed data for a Document using its UUID. Will never return a result for embedded documents.
 * @param {string} uuid  The UUID of the Document index to retrieve.
 * @returns {object}     Document's index if one could be found.
 */
export function indexFromUuid(uuid) {
  const parts = uuid.split(".");
  let index;

  // Compendium Documents
  if ( parts[0] === "Compendium" ) {
    const [, scope, packName, id] = parts;
    const pack = game.packs.get(`${scope}.${packName}`);
    index = pack?.index.get(id);
  }

  // World Documents
  else if ( parts.length < 3 ) {
    const [docName, id] = parts;
    const collection = CONFIG[docName].collection.instance;
    index = collection.get(id);
  }

  return index || null;
}

/* -------------------------------------------- */

/**
 * Creates an HTML document link for the provided UUID.
 * Try to build links to compendium content synchronously to avoid DB lookups.
 * @param {string} uuid               UUID for which to produce the link.
 * @param {object} [options]
 * @param {string} [options.tooltip]  Tooltip to add to the link.
 * @returns {string}                  Link to the item or empty string if item wasn't found.
 */
export function linkForUuid(uuid, { tooltip }={}) {
  let doc = fromUuidSync(uuid);
  if ( !doc ) return "";
  if ( uuid.startsWith("Compendium.") && !(doc instanceof foundry.abstract.Document) ) {
    const {collection} = foundry.utils.parseUuid(uuid);
    const cls = collection.documentClass;
    // Minimal "shell" of a document using index data
    doc = new cls(foundry.utils.deepClone(doc), {pack: collection.metadata.id});
  }
  const a = doc.toAnchor();
  if ( tooltip ) a.dataset.tooltip = tooltip;
  return a.outerHTML;
}

/* -------------------------------------------- */
/*  Targeting                                   */
/* -------------------------------------------- */

/**
 * Get currently selected tokens in the scene or user's character's tokens.
 * @returns {Token5e[]}
 */
export function getSceneTargets() {
  let targets = canvas.tokens.controlled.filter(t => t.actor);
  if ( !targets.length && game.user.character ) targets = game.user.character.getActiveTokens();
  return targets;
}

/* -------------------------------------------- */
/*  Conversions                                 */
/* -------------------------------------------- */

/**
 * Convert the provided weight to another unit.
 * @param {number} value  The weight being converted.
 * @param {string} from   The initial units.
 * @param {string} to     The final units.
 * @returns {number}      Weight in the specified units.
 */
export function convertWeight(value, from, to) {
  if ( from === to ) return value;
  const message = unit => `Weight unit ${unit} not defined in CONFIG.DND5E.weightUnits`;
  if ( !CONFIG.DND5E.weightUnits[from] ) throw new Error(message(from));
  if ( !CONFIG.DND5E.weightUnits[to] ) throw new Error(message(to));
  return value
    * CONFIG.DND5E.weightUnits[from].conversion
    / CONFIG.DND5E.weightUnits[to].conversion;
}

/* -------------------------------------------- */
/*  Validators                                  */
/* -------------------------------------------- */

/**
 * Ensure the provided string contains only the characters allowed in identifiers.
 * @param {string} identifier
 * @returns {boolean}
 */
function isValidIdentifier(identifier) {
  return /^([a-z0-9_-]+)$/i.test(identifier);
}

export const validators = {
  isValidIdentifier: isValidIdentifier
};

/* -------------------------------------------- */
/*  Handlebars Template Helpers                 */
/* -------------------------------------------- */

/**
 * Define a set of template paths to pre-load. Pre-loaded templates are compiled and cached for fast access when
 * rendering. These paths will also be available as Handlebars partials by using the file name
 * (e.g. "dnd5e.actor-traits").
 * @returns {Promise}
 */
export async function preloadHandlebarsTemplates() {
  const partials = [
    // Shared Partials
    "systems/dnd5e/templates/shared/active-effects.hbs",
    "systems/dnd5e/templates/shared/active-effects2.hbs",
    "systems/dnd5e/templates/shared/inventory.hbs",
    "systems/dnd5e/templates/shared/inventory2.hbs",
    "systems/dnd5e/templates/apps/parts/trait-list.hbs",

    // Actor Sheet Partials
    "systems/dnd5e/templates/actors/parts/actor-classes.hbs",
    "systems/dnd5e/templates/actors/parts/actor-trait-pills.hbs",
    "systems/dnd5e/templates/actors/parts/actor-traits.hbs",
    "systems/dnd5e/templates/actors/parts/actor-features.hbs",
    "systems/dnd5e/templates/actors/parts/actor-inventory.hbs",
    "systems/dnd5e/templates/actors/parts/actor-spellbook.hbs",
    "systems/dnd5e/templates/actors/parts/actor-warnings.hbs",
    "systems/dnd5e/templates/actors/parts/actor-warnings-dialog.hbs",
    "systems/dnd5e/templates/actors/parts/biography-textbox.hbs",
    "systems/dnd5e/templates/actors/tabs/character-biography.hbs",
    "systems/dnd5e/templates/actors/tabs/character-details.hbs",
    "systems/dnd5e/templates/actors/tabs/creature-features.hbs",
    "systems/dnd5e/templates/actors/tabs/creature-spells.hbs",
    "systems/dnd5e/templates/actors/tabs/group-members.hbs",
    "systems/dnd5e/templates/actors/tabs/npc-biography.hbs",

    // Actor Sheet Item Summary Columns
    "systems/dnd5e/templates/actors/parts/columns/column-feature-controls.hbs",
    "systems/dnd5e/templates/actors/parts/columns/column-formula.hbs",
    "systems/dnd5e/templates/actors/parts/columns/column-recovery.hbs",
    "systems/dnd5e/templates/actors/parts/columns/column-roll.hbs",
    "systems/dnd5e/templates/actors/parts/columns/column-uses.hbs",

    // Item Sheet Partials
    "systems/dnd5e/templates/items/parts/item-action.hbs",
    "systems/dnd5e/templates/items/parts/item-activation.hbs",
    "systems/dnd5e/templates/items/parts/item-advancement.hbs",
    "systems/dnd5e/templates/items/parts/item-advancement2.hbs",
    "systems/dnd5e/templates/items/parts/item-description.hbs",
    "systems/dnd5e/templates/items/parts/item-description2.hbs",
    "systems/dnd5e/templates/items/parts/item-mountable.hbs",
    "systems/dnd5e/templates/items/parts/item-spellcasting.hbs",
    "systems/dnd5e/templates/items/parts/item-source.hbs",
    "systems/dnd5e/templates/items/parts/item-summary.hbs",
    "systems/dnd5e/templates/items/parts/item-tooltip.hbs",
    "systems/dnd5e/templates/items/parts/spell-block.hbs",

    // Journal Partials
    "systems/dnd5e/templates/journal/parts/journal-table.hbs",

    // Advancement Partials
    "systems/dnd5e/templates/advancement/parts/advancement-ability-score-control.hbs",
    "systems/dnd5e/templates/advancement/parts/advancement-controls.hbs",
    "systems/dnd5e/templates/advancement/parts/advancement-spell-config.hbs"
  ];

  const paths = {};
  for ( const path of partials ) {
    paths[path.replace(".hbs", ".html")] = path;
    paths[`dnd5e.${path.split("/").pop().replace(".hbs", "")}`] = path;
  }

  return loadTemplates(paths);
}

/* -------------------------------------------- */

/**
 * A helper that converts the provided object into a series of `data-` entries.
 * @param {object} object   Object to convert into dataset entries.
 * @param {object} options  Handlebars options.
 * @returns {string}
 */
function dataset(object, options) {
  const entries = [];
  for ( let [key, value] of Object.entries(object ?? {}) ) {
    key = key.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (a, b) => (b ? "-" : "") + a.toLowerCase());
    entries.push(`data-${key}="${value}"`);
  }
  return new Handlebars.SafeString(entries.join(" "));
}

/* -------------------------------------------- */

/**
 * A helper to create a set of <option> elements in a <select> block grouped together
 * in <optgroup> based on the provided categories.
 *
 * @param {SelectChoices} choices          Choices to format.
 * @param {object} [options]
 * @param {boolean} [options.localize]     Should the label be localized?
 * @param {string} [options.blank]         Name for the empty option, if one should be added.
 * @param {string} [options.labelAttr]     Attribute pointing to label string.
 * @param {string} [options.chosenAttr]    Attribute pointing to chosen boolean.
 * @param {string} [options.childrenAttr]  Attribute pointing to array of children.
 * @returns {Handlebars.SafeString}        Formatted option list.
 */
function groupedSelectOptions(choices, options) {
  const localize = options.hash.localize ?? false;
  const blank = options.hash.blank ?? null;
  const labelAttr = options.hash.labelAttr ?? "label";
  const chosenAttr = options.hash.chosenAttr ?? "chosen";
  const childrenAttr = options.hash.childrenAttr ?? "children";

  // Create an option
  const option = (name, label, chosen) => {
    if ( localize ) label = game.i18n.localize(label);
    html += `<option value="${name}" ${chosen ? "selected" : ""}>${label}</option>`;
  };

  // Create a group
  const group = category => {
    let label = category[labelAttr];
    if ( localize ) game.i18n.localize(label);
    html += `<optgroup label="${label}">`;
    children(category[childrenAttr]);
    html += "</optgroup>";
  };

  // Add children
  const children = children => {
    for ( let [name, child] of Object.entries(children) ) {
      if ( child[childrenAttr] ) group(child);
      else option(name, child[labelAttr], child[chosenAttr] ?? false);
    }
  };

  // Create the options
  let html = "";
  if ( blank !== null ) option("", blank);
  children(choices);
  return new Handlebars.SafeString(html);
}

/* -------------------------------------------- */

/**
 * A helper that fetch the appropriate item context from root and adds it to the first block parameter.
 * @param {object} context  Current evaluation context.
 * @param {object} options  Handlebars options.
 * @returns {string}
 */
function itemContext(context, options) {
  if ( arguments.length !== 2 ) throw new Error("#dnd5e-itemContext requires exactly one argument");
  if ( foundry.utils.getType(context) === "function" ) context = context.call(this);

  const ctx = options.data.root.itemContext?.[context.id];
  if ( !ctx ) {
    const inverse = options.inverse(this);
    if ( inverse ) return options.inverse(this);
  }

  return options.fn(context, { data: options.data, blockParams: [ctx] });
}

/* -------------------------------------------- */

/**
 * Conceal a section and display a notice if unidentified.
 * @param {boolean} conceal  Should the section be concealed?
 * @param {object} options   Handlebars options.
 * @returns {string}
 */
function concealSection(conceal, options) {
  let content = options.fn(this);
  if ( !conceal ) return content;

  content = `<div inert>
    ${content}
  </div>
  <div class="unidentified-notice">
      <div>
          <strong>${game.i18n.localize("DND5E.Unidentified.Title")}</strong>
          <p>${game.i18n.localize("DND5E.Unidentified.Notice")}</p>
      </div>
  </div>`;
  return content;
}

/* -------------------------------------------- */

/**
 * Register custom Handlebars helpers used by 5e.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper({
    getProperty: foundry.utils.getProperty,
    "dnd5e-concealSection": concealSection,
    "dnd5e-dataset": dataset,
    "dnd5e-formatCR": formatCR,
    "dnd5e-formatModifier": formatModifier,
    "dnd5e-groupedSelectOptions": groupedSelectOptions,
    "dnd5e-itemContext": itemContext,
    "dnd5e-linkForUuid": (uuid, options) => linkForUuid(uuid, options.hash),
    "dnd5e-numberFormat": (context, options) => formatNumber(context, options.hash),
    "dnd5e-textFormat": formatText
  });
}

/* -------------------------------------------- */
/*  Config Pre-Localization                     */
/* -------------------------------------------- */

/**
 * Storage for pre-localization configuration.
 * @type {object}
 * @private
 */
const _preLocalizationRegistrations = {};

/**
 * Mark the provided config key to be pre-localized during the init stage.
 * @param {string} configKeyPath          Key path within `CONFIG.DND5E` to localize.
 * @param {object} [options={}]
 * @param {string} [options.key]          If each entry in the config enum is an object,
 *                                        localize and sort using this property.
 * @param {string[]} [options.keys=[]]    Array of localization keys. First key listed will be used for sorting
 *                                        if multiple are provided.
 * @param {boolean} [options.sort=false]  Sort this config enum, using the key if set.
 */
export function preLocalize(configKeyPath, { key, keys=[], sort=false }={}) {
  if ( key ) keys.unshift(key);
  _preLocalizationRegistrations[configKeyPath] = { keys, sort };
}

/* -------------------------------------------- */

/**
 * Execute previously defined pre-localization tasks on the provided config object.
 * @param {object} config  The `CONFIG.DND5E` object to localize and sort. *Will be mutated.*
 */
export function performPreLocalization(config) {
  for ( const [keyPath, settings] of Object.entries(_preLocalizationRegistrations) ) {
    const target = foundry.utils.getProperty(config, keyPath);
    if ( !target ) continue;
    _localizeObject(target, settings.keys);
    if ( settings.sort ) foundry.utils.setProperty(config, keyPath, sortObjectEntries(target, settings.keys[0]));
  }

  // Localize & sort status effects
  CONFIG.statusEffects.forEach(s => s.name = game.i18n.localize(s.name));
  CONFIG.statusEffects.sort((lhs, rhs) =>
    lhs.id === "dead" ? -1 : rhs.id === "dead" ? 1 : lhs.name.localeCompare(rhs.name, game.i18n.lang)
  );
}

/* -------------------------------------------- */

/**
 * Localize the values of a configuration object by translating them in-place.
 * @param {object} obj       The configuration object to localize.
 * @param {string[]} [keys]  List of inner keys that should be localized if this is an object.
 * @private
 */
function _localizeObject(obj, keys) {
  for ( const [k, v] of Object.entries(obj) ) {
    const type = typeof v;
    if ( type === "string" ) {
      obj[k] = game.i18n.localize(v);
      continue;
    }

    if ( type !== "object" ) {
      console.error(new Error(
        `Pre-localized configuration values must be a string or object, ${type} found for "${k}" instead.`
      ));
      continue;
    }
    if ( !keys?.length ) {
      console.error(new Error(
        "Localization keys must be provided for pre-localizing when target is an object."
      ));
      continue;
    }

    for ( const key of keys ) {
      const value = foundry.utils.getProperty(v, key);
      if ( !value ) continue;
      foundry.utils.setProperty(v, key, game.i18n.localize(value));
    }
  }
}

/* -------------------------------------------- */
/*  Localization                                */
/* -------------------------------------------- */

/**
 * A cache of already-fetched labels for faster lookup.
 * @type {Map<string, string>}
 */
const _attributeLabelCache = new Map();

/**
 * Convert an attribute path to a human-readable label.
 * @param {string} attr              The attribute path.
 * @param {object} [options]
 * @param {Actor5e} [options.actor]  An optional reference actor.
 * @returns {string|void}
 */
export function getHumanReadableAttributeLabel(attr, { actor }={}) {
  // Check any actor-specific names first.
  if ( attr.startsWith("resources.") && actor ) {
    const resource = foundry.utils.getProperty(actor, `system.${attr}`);
    if ( resource.label ) return resource.label;
  }

  if ( (attr === "details.xp.value") && (actor?.type === "npc") ) {
    return game.i18n.localize("DND5E.ExperiencePointsValue");
  }

  if ( attr.startsWith(".") && actor ) {
    const item = fromUuidSync(attr, { relative: actor });
    return item?.name ?? attr;
  }

  // Check if the attribute is already in cache.
  let label = _attributeLabelCache.get(attr);
  if ( label ) return label;

  // Derived fields.
  if ( attr === "attributes.init.total" ) label = "DND5E.InitiativeBonus";
  else if ( attr === "attributes.ac.value" ) label = "DND5E.ArmorClass";
  else if ( attr === "attributes.spelldc" ) label = "DND5E.SpellDC";

  // Abilities.
  else if ( attr.startsWith("abilities.") ) {
    const [, key] = attr.split(".");
    label = game.i18n.format("DND5E.AbilityScoreL", { ability: CONFIG.DND5E.abilities[key].label });
  }

  // Skills.
  else if ( attr.startsWith("skills.") ) {
    const [, key] = attr.split(".");
    label = game.i18n.format("DND5E.SkillPassiveScore", { skill: CONFIG.DND5E.skills[key].label });
  }

  // Spell slots.
  else if ( attr.startsWith("spells.") ) {
    const [, key] = attr.split(".");
    if ( !/spell\d+/.test(key) ) label = `DND5E.SpellSlots${key.capitalize()}`;
    else {
      const plurals = new Intl.PluralRules(game.i18n.lang, {type: "ordinal"});
      const level = Number(key.slice(5));
      label = game.i18n.format(`DND5E.SpellSlotsN.${plurals.select(level)}`, { n: level });
    }
  }

  // Attempt to find the attribute in a data model.
  if ( !label ) {
    const { CharacterData, NPCData, VehicleData, GroupData } = dnd5e.dataModels.actor;
    for ( const model of [CharacterData, NPCData, VehicleData, GroupData] ) {
      const field = model.schema.getField(attr);
      if ( field ) {
        label = field.label;
        break;
      }
    }
  }

  if ( label ) {
    label = game.i18n.localize(label);
    _attributeLabelCache.set(attr, label);
  }

  return label;
}

/* -------------------------------------------- */
/*  Migration                                   */
/* -------------------------------------------- */

/**
 * Synchronize the spells for all Actors in some collection with source data from an Item compendium pack.
 * @param {CompendiumCollection} actorPack      An Actor compendium pack which will be updated
 * @param {CompendiumCollection} spellsPack     An Item compendium pack which provides source data for spells
 * @returns {Promise<void>}
 */
export async function synchronizeActorSpells(actorPack, spellsPack) {

  // Load all actors and spells
  const actors = await actorPack.getDocuments();
  const spells = await spellsPack.getDocuments();
  const spellsMap = spells.reduce((obj, item) => {
    obj[item.name] = item;
    return obj;
  }, {});

  // Unlock the pack
  await actorPack.configure({locked: false});

  // Iterate over actors
  SceneNavigation.displayProgressBar({label: "Synchronizing Spell Data", pct: 0});
  for ( const [i, actor] of actors.entries() ) {
    const {toDelete, toCreate} = _synchronizeActorSpells(actor, spellsMap);
    if ( toDelete.length ) await actor.deleteEmbeddedDocuments("Item", toDelete);
    if ( toCreate.length ) await actor.createEmbeddedDocuments("Item", toCreate, {keepId: true});
    console.debug(`${actor.name} | Synchronized ${toCreate.length} spells`);
    SceneNavigation.displayProgressBar({label: actor.name, pct: ((i / actors.length) * 100).toFixed(0)});
  }

  // Re-lock the pack
  await actorPack.configure({locked: true});
  SceneNavigation.displayProgressBar({label: "Synchronizing Spell Data", pct: 100});
}

/* -------------------------------------------- */

/**
 * A helper function to synchronize spell data for a specific Actor.
 * @param {Actor5e} actor
 * @param {Object<string,Item5e>} spellsMap
 * @returns {{toDelete: string[], toCreate: object[]}}
 * @private
 */
function _synchronizeActorSpells(actor, spellsMap) {
  const spells = actor.itemTypes.spell;
  const toDelete = [];
  const toCreate = [];
  if ( !spells.length ) return {toDelete, toCreate};

  for ( const spell of spells ) {
    const source = spellsMap[spell.name];
    if ( !source ) {
      console.warn(`${actor.name} | ${spell.name} | Does not exist in spells compendium pack`);
      continue;
    }

    // Combine source data with the preparation and uses data from the actor
    const spellData = source.toObject();
    const {preparation, uses, save} = spell.toObject().system;
    Object.assign(spellData.system, {preparation, uses});
    spellData.system.save.dc = save.dc;
    foundry.utils.setProperty(spellData, "_stats.compendiumSource", source.uuid);

    // Record spells to be deleted and created
    toDelete.push(spell.id);
    toCreate.push(spellData);
  }
  return {toDelete, toCreate};
}
