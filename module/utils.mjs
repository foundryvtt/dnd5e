/* -------------------------------------------- */
/*  Formatters                                  */
/* -------------------------------------------- */

/**
 * Format a Challenge Rating using the proper fractional symbols.
 * @param {number} value                   CR value to format.
 * @param {object} [options={}]
 * @param {boolean} [options.narrow=true]  Use narrow fractions (e.g. ⅛) rather than wide ones (e.g. 1/8).
 * @returns {string}
 */
export function formatCR(value, { narrow=true }={}) {
  if ( value === null ) return "—";
  const fractions = narrow ? { 0.125: "⅛", 0.25: "¼", 0.5: "½" } : { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };
  return fractions[value] ?? formatNumber(value);
}

/* -------------------------------------------- */

/**
 * Form a number using the provided length unit.
 * @param {number} value         The length to format.
 * @param {string} unit          Length unit as defined in `CONFIG.DND5E.movementUnits`.
 * @param {object} [options={}]  Formatting options passed to `formatNumber`.
 * @returns {string}
 */
export function formatLength(value, unit, options={}) {
  return _formatSystemUnits(value, unit, CONFIG.DND5E.movementUnits[unit], options);
}

/* -------------------------------------------- */

/**
 * Format a modifier for display with its sign separate.
 * @param {number} mod  The modifier.
 * @returns {Handlebars.SafeString}
 */
export function formatModifier(mod) {
  if ( !Number.isFinite(mod) ) return new Handlebars.SafeString("—");
  return new Handlebars.SafeString(`<span class="sign">${mod < 0 ? "-" : "+"}</span>${Math.abs(mod)}`);
}

/* -------------------------------------------- */

/**
 * A helper for using Intl.NumberFormat within handlebars.
 * @param {number} value    The value to format.
 * @param {object} options  Options forwarded to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat}
 * @param {string} [options.blank]      Format a zero or otherwise empty value as the given string.
 * @param {boolean} [options.numerals]  Format the number as roman numerals.
 * @param {boolean} [options.ordinal]   Use ordinal formatting.
 * @param {boolean} [options.words]     Write out number as full word, if possible.
 * @returns {string}
 */
export function formatNumber(value, { blank, numerals, ordinal, words, ...options }={}) {
  if ( words && game.i18n.has(`DND5E.NUMBER.${value}`, false) ) return game.i18n.localize(`DND5E.NUMBER.${value}`);
  if ( !value && (typeof blank === "string") ) return blank;
  if ( numerals ) return _formatNumberAsNumerals(value);
  if ( ordinal ) return _formatNumberAsOrdinal(value, options);
  const formatter = new Intl.NumberFormat(game.i18n.lang, options);
  return formatter.format(value);
}

/**
 * Roman numerals.
 * @type {Record<string, number>}
 */
const _roman = {
  M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
};

/**
 * Format a number as roman numerals.
 * @param {number} n  The number to format.
 * @returns {string}
 */
function _formatNumberAsNumerals(n) {
  let out = "";
  if ( (n < 1) || !Number.isInteger(n) ) return out;
  for ( const [numeral, decimal] of Object.entries(_roman) ) {
    const quotient = Math.floor(n / decimal);
    n -= quotient * decimal;
    out += numeral.repeat(quotient);
  }
  return out;
}

/* -------------------------------------------- */

/**
 * Format a number using an ordinal format.
 * @param {number} n        The number to format.
 * @param {object} options  Options forwarded to `formatNumber`.
 * @returns {string}
 */
function _formatNumberAsOrdinal(n, options={}) {
  const pr = getPluralRules({ type: "ordinal" }).select(n);
  const number = formatNumber(n, options);
  return game.i18n.has(`DND5E.ORDINAL.${pr}`) ? game.i18n.format(`DND5E.ORDINAL.${pr}`, { number }) : number;
}

/* -------------------------------------------- */

/**
 * Produce a number with the parts wrapped in their own spans.
 * @param {number} value      A number for format.
 * @param {object} [options]  Formatting options.
 * @returns {string}
 */
export function formatNumberParts(value, options) {
  if ( options.numerals ) throw new Error("Cannot segment numbers when formatted as numerals.");
  return new Intl.NumberFormat(game.i18n.lang, options).formatToParts(value)
    .reduce((str, { type, value }) => `${str}<span class="${type}">${value}</span>`, "");
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

/**
 * A helper function that formats a time in a human-readable format.
 * @param {number} value         Time to display.
 * @param {string} unit          Units as defined in `CONFIG.DND5E.timeUnits`.
 * @param {object} [options={}]  Formatting options passed to `formatNumber`.
 * @returns {string}
 */
export function formatTime(value, unit, options={}) {
  options.maximumFractionDigits ??= 0;
  options.unitDisplay ??= "long";
  const config = CONFIG.DND5E.timeUnits[unit];
  if ( config?.counted ) {
    if ( (options.unitDisplay === "narrow") && game.i18n.has(`${config.counted}.narrow`) ) {
      return game.i18n.format(`${config.counted}.narrow`, { number: formatNumber(value, options) });
    } else {
      const pr = new Intl.PluralRules(game.i18n.lang);
      return game.i18n.format(`${config.counted}.${pr.select(value)}`, { number: formatNumber(value, options) });
    }
  }
  try {
    return formatNumber(value, { ...options, style: "unit", unit });
  } catch(err) {
    return formatNumber(value, options);
  }
}

/* -------------------------------------------- */

/**
 * Form a number using the provided volume unit.
 * @param {number} value         The volume to format.
 * @param {string} unit          Volume unit as defined in `CONFIG.DND5E.volumeUnits`.
 * @param {object} [options={}]  Formatting options passed to `formatNumber`.
 * @returns {string}
 */
export function formatVolume(value, unit, options={}) {
  return _formatSystemUnits(value, unit, CONFIG.DND5E.volumeUnits[unit], options);
}

/* -------------------------------------------- */

/**
 * Form a number using the provided weight unit.
 * @param {number} value         The weight to format.
 * @param {string} unit          Weight unit as defined in `CONFIG.DND5E.weightUnits`.
 * @param {object} [options={}]  Formatting options passed to `formatNumber`.
 * @returns {string}
 */
export function formatWeight(value, unit, options={}) {
  return _formatSystemUnits(value, unit, CONFIG.DND5E.weightUnits[unit], options);
}

/* -------------------------------------------- */

/**
 * Format a number using one of core's built-in unit types.
 * @param {number} value                   Value to display.
 * @param {string} unit                    Name of the unit to use.
 * @param {UnitConfiguration} config       Configuration data for the unit.
 * @param {object} [options={}]            Formatting options passed to `formatNumber`.
 * @param {boolean} [options.parts=false]  Format to parts.
 * @returns {string}
 */
function _formatSystemUnits(value, unit, config, { parts=false, ...options }={}) {
  options.unitDisplay ??= "short";
  if ( config?.counted ) {
    const localizationKey = `${config.counted}.${options.unitDisplay}.${getPluralRules().select(value)}`;
    return game.i18n.format(localizationKey, { number: formatNumber(value, options) });
  }
  unit = config?.formattingUnit ?? unit;
  if ( isValidUnit(unit) ) {
    options.style ??= "unit";
    options.unit ??= unit;
  }
  return (parts ? formatNumberParts : formatNumber)(value, options);
}

/* -------------------------------------------- */

/**
 * Cached store of Intl.PluralRules instances.
 * @type {Record<string, Intl.PluralRules>}
 */
const _pluralRules = {};

/**
 * Get a PluralRules object, fetching from cache if possible.
 * @param {object} [options={}]
 * @param {string} [options.type=cardinal]
 * @returns {Intl.PluralRules}
 */
export function getPluralRules({ type="cardinal" }={}) {
  _pluralRules[type] ??= new Intl.PluralRules(game.i18n.lang, { type });
  return _pluralRules[type];
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
  const prop = input.dataset.name ?? input.name;
  const current = foundry.utils.getProperty(target?._source ?? {}, prop) ?? foundry.utils.getProperty(target, prop);
  let value = input.value;
  if ( ["+", "-"].includes(value[0]) ) {
    const delta = parseFloat(value);
    value = Number(current) + delta;
  }
  else if ( value[0] === "=" ) value = Number(value.slice(1));
  if ( Number.isNaN(value) ) return;
  input.value = value;
  return value;
}

/* -------------------------------------------- */

/**
 * Prepare the final formula value for a model field.
 * @param {ItemDataModel|BaseActivityData} model  Model for which the value is being prepared.
 * @param {string} keyPath                        Path to the field within the model.
 * @param {string} label                          Label to use in preparation warnings.
 * @param {object} rollData                       Roll data to use when replacing formula values.
 */
export function prepareFormulaValue(model, keyPath, label, rollData) {
  const value = foundry.utils.getProperty(model, keyPath);
  if ( !value ) return;
  const item = model.item ?? model.parent;
  const property = game.i18n.localize(label);
  try {
    const formula = replaceFormulaData(value, rollData, { item, property });
    const roll = new Roll(formula);
    foundry.utils.setProperty(model, keyPath, roll.evaluateSync().total);
  } catch(err) {
    if ( item.isEmbedded ) {
      const message = game.i18n.format("DND5E.FormulaMalformedError", { property, name: model.name ?? item.name });
      item.actor._preparationWarnings.push({ message, link: item.uuid, type: "error" });
      console.error(message, err);
    }
  }
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
/*  Keybindings Helper                          */
/* -------------------------------------------- */

const { MODIFIER_CODES: CODES, MODIFIER_KEYS } = (foundry.helpers?.interaction?.KeyboardManager ?? KeyboardManager);

/**
 * Track which KeyboardEvent#code presses associate with each modifier.
 * Added support for treating Meta separate from Control.
 * @enum {string[]}
 */
const MODIFIER_CODES = {
  Alt: CODES.Alt,
  Control: CODES.Control.filter(k => k.startsWith("Control")),
  Meta: CODES.Control.filter(k => !k.startsWith("Control")),
  Shift: CODES.Shift
};

/**
 * Based on the provided event, determine if the keys are pressed to fulfill the specified keybinding.
 * @param {Event} event    Triggering event.
 * @param {string} action  Keybinding action within the `dnd5e` namespace.
 * @returns {boolean}      Is the keybinding triggered?
 */
export function areKeysPressed(event, action) {
  if ( !event ) return false;
  const activeModifiers = {};
  const addModifiers = (key, pressed) => {
    activeModifiers[key] = pressed;
    MODIFIER_CODES[key].forEach(n => activeModifiers[n] = pressed);
  };
  addModifiers(MODIFIER_KEYS.ALT, event.altKey);
  addModifiers(MODIFIER_KEYS.CONTROL, event.ctrlKey);
  addModifiers("Meta", event.metaKey);
  addModifiers(MODIFIER_KEYS.SHIFT, event.shiftKey);
  return game.keybindings.get("dnd5e", action).some(b => {
    if ( game.keyboard.downKeys.has(b.key) && b.modifiers.every(m => activeModifiers[m]) ) return true;
    if ( b.modifiers.length ) return false;
    return activeModifiers[b.key];
  });
}

/* -------------------------------------------- */
/*  Logging                                     */
/* -------------------------------------------- */

/**
 * Log a console message with the "D&D 5e" prefix and styling.
 * @param {string} message                    Message to display.
 * @param {object} [options={}]
 * @param {string} [options.color="#6e0000"]  Color to use for the log.
 * @param {any[]} [options.extras=[]]         Extra options passed to the logging method.
 * @param {string} [options.level="log"]      Console logging method to call.
 */
export function log(message, { color="#6e0000", extras=[], level="log" }={}) {
  console[level](
    `%cD&D 5e | %c${message}`, `color: ${color}; font-variant: small-caps`, "color: revert", ...extras
  );
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
 * Check whether an object exists without transversing any getters, preventing any deprecation warnings from triggering.
 * @param {object} object
 * @param {string} keyPath
 * @returns {boolean}
 */
export function safePropertyExists(object, keyPath) {
  const parts = keyPath.split(".");
  for ( const part of parts ) {
    const descriptor = Object.getOwnPropertyDescriptor(object, part);
    if ( !descriptor || !("value" in descriptor) ) return false;
    object = object[part];
  }
  return true;
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
 * @param {string} uuid                    UUID for which to produce the link.
 * @param {object} [options]
 * @param {string} [options.tooltip]       Tooltip to add to the link.
 * @param {string} [options.renderBroken]  If a UUID cannot found, render it as a broken link instead of returning the
 *                                         empty string.
 * @returns {string}                       Link to the item or empty string if item wasn't found.
 */
export function linkForUuid(uuid, { tooltip, renderBroken }={}) {
  let doc = fromUuidSync(uuid);
  if ( !doc ) {
    if ( renderBroken ) return `
      <a class="content-link broken" data-uuid="${uuid}">
        <i class="fas fa-unlink"></i> ${game.i18n.localize("Unknown")}
      </a>
    `;
    return "";
  }
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
 * Important information on a targeted token.
 *
 * @typedef {object} TargetDescriptor5e
 * @property {string} uuid  The UUID of the target.
 * @property {string} img   The target's image.
 * @property {string} name  The target's name.
 * @property {number} ac    The target's armor class, if applicable.
 */

/**
 * Grab the targeted tokens and return relevant information on them.
 * @returns {TargetDescriptor[]}
 */
export function getTargetDescriptors() {
  const targets = new Map();
  for ( const token of game.user.targets ) {
    const { name } = token;
    const { img, system, uuid, statuses } = token.actor ?? {};
    if ( uuid ) {
      const ac = statuses.has("coverTotal") ? null : system.attributes?.ac?.value;
      targets.set(uuid, { name, img, uuid, ac: ac ?? null });
    }
  }
  return Array.from(targets.values());
}

/* -------------------------------------------- */

/**
 * Get currently selected tokens in the scene or user's character's tokens.
 * @returns {Token5e[]}
 */
export function getSceneTargets() {
  let targets = canvas.tokens?.controlled.filter(t => t.actor) ?? [];
  if ( !targets.length && game.user.character ) targets = game.user.character.getActiveTokens();
  return targets;
}

/* -------------------------------------------- */
/*  Conversions                                 */
/* -------------------------------------------- */

/**
 * Convert the provided length to another unit.
 * @param {number} value                   The length being converted.
 * @param {string} from                    The initial units.
 * @param {string} to                      The final units.
 * @param {object} [options={}]
 * @param {boolean} [options.strict=true]  Throw an error if either unit isn't found.
 * @returns {number}
 */
export function convertLength(value, from, to, { strict=true }={}) {
  const message = unit => `Length unit ${unit} not defined in CONFIG.DND5E.movementUnits`;
  return _convertSystemUnits(value, from, to, CONFIG.DND5E.movementUnits, { message, strict });
}

/* -------------------------------------------- */

/**
 * Convert the provided time value to another unit. If no final unit is provided, then will convert it to the largest
 * unit that can still represent the value as a whole number.
 * @param {number} value                    The time being converted.
 * @param {string} from                     The initial unit as defined in `CONFIG.DND5E.timeUnits`.
 * @param {object} [options={}]
 * @param {boolean} [options.combat=false]  Use combat units when auto-selecting units, rather than normal units.
 * @param {boolean} [options.strict=true]   Throw an error if from unit isn't found.
 * @param {string} [options.to]             The final units, if explicitly provided.
 * @returns {{ value: number, unit: string }}
 */
export function convertTime(value, from, { combat=false, strict=true, to }={}) {
  const base = value * (CONFIG.DND5E.timeUnits[from]?.conversion ?? 1);
  if ( !to ) {
    // Find unit with largest conversion value that can still display the value
    const unitOptions = Object.entries(CONFIG.DND5E.timeUnits)
      .reduce((arr, [key, v]) => {
        if ( ((v.combat ?? false) === combat) && ((base % v.conversion === 0) || (base >= v.conversion * 2)) ) {
          arr.push({ key, conversion: v.conversion });
        }
        return arr;
      }, [])
      .sort((lhs, rhs) => rhs.conversion - lhs.conversion);
    to = unitOptions[0]?.key ?? from;
  }

  const message = unit => `Time unit ${unit} not defined in CONFIG.DND5E.timeUnits`;
  return { value: _convertSystemUnits(value, from, to, CONFIG.DND5E.timeUnits, { message, strict }), unit: to };
}

/* -------------------------------------------- */

/**
 * Convert the provided weight to another unit.
 * @param {number} value                   The weight being converted.
 * @param {string} from                    The initial unit as defined in `CONFIG.DND5E.weightUnits`.
 * @param {string} to                      The final units.
 * @param {object} [options={}]
 * @param {boolean} [options.strict=true]  Throw an error if either unit isn't found.
 * @returns {number}      Weight in the specified units.
 */
export function convertWeight(value, from, to, { strict=true }={}) {
  const message = unit => `Weight unit ${unit} not defined in CONFIG.DND5E.weightUnits`;
  return _convertSystemUnits(value, from, to, CONFIG.DND5E.weightUnits, { message, strict });
}

/* -------------------------------------------- */

/**
 * Convert from one unit to another using one of core's built-in unit types.
 * @param {number} value                                Value to display.
 * @param {string} from                                 The initial unit.
 * @param {string} to                                   The final unit.
 * @param {UnitConfiguration} config                    Configuration data for the unit.
 * @param {object} options
 * @param {function(string): string} [options.message]  Method used to produce the error message if unit not found.
 * @param {boolean} [options.strict]                    Throw an error if either unit isn't found.
 * @returns {string}
 */
function _convertSystemUnits(value, from, to, config, { message, strict }) {
  if ( from === to ) return value;
  if ( strict && !config[from] ) throw new Error(message(from));
  if ( strict && !config[to] ) throw new Error(message(to));
  return value * (config[from]?.conversion ?? 1) / (config[to]?.conversion ?? 1);
}

/* -------------------------------------------- */

/**
 * Default units to use depending on system setting.
 * @param {"length"|"travel"|"volume"|"weight"} type  Type of units to select.
 * @returns {string}
 */
export function defaultUnits(type) {
  const settingKey = type === "travel" ? "metricLengthUnits" : `metric${type.capitalize()}Units`;
  return CONFIG.DND5E.defaultUnits[type]?.[game.settings.get("dnd5e", settingKey) ? "metric" : "imperial"];
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

/**
 * Determine whether the provided unit is usable within `Intl.NumberFormat`.
 * @param {string} unit
 * @returns {boolean}
 */
export function isValidUnit(unit) {
  if ( unit?.includes("-per-") ) return unit.split("-per-").every(u => isValidUnit(u));
  return Intl.supportedValuesOf("unit").includes(unit);
}

/* -------------------------------------------- */

/**
 * Test if a given string is serialized JSON, and parse it if so.
 * @param {string} raw  The raw value.
 * @returns {any}       The parsed value, or the original value if it was not serialized JSON.
 */
export function parseOrString(raw) {
  try { return JSON.parse(raw); } catch(err) {}
  return raw;
}

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
    "systems/dnd5e/templates/apps/parts/trait-list.hbs",
    "systems/dnd5e/templates/apps/parts/traits-list.hbs",

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
    "systems/dnd5e/templates/actors/tabs/character-bastion.hbs",
    "systems/dnd5e/templates/actors/tabs/character-biography.hbs",
    "systems/dnd5e/templates/actors/tabs/character-details.hbs",
    "systems/dnd5e/templates/actors/tabs/creature-special-traits.hbs",
    "systems/dnd5e/templates/actors/tabs/group-members.hbs",
    "systems/dnd5e/templates/actors/tabs/npc-biography.hbs",

    // Chat Message Partials
    "systems/dnd5e/templates/chat/parts/card-activities.hbs",
    "systems/dnd5e/templates/chat/parts/card-deltas.hbs",

    // Item Sheet Partials
    "systems/dnd5e/templates/items/details/details-background.hbs",
    "systems/dnd5e/templates/items/details/details-class.hbs",
    "systems/dnd5e/templates/items/details/details-consumable.hbs",
    "systems/dnd5e/templates/items/details/details-container.hbs",
    "systems/dnd5e/templates/items/details/details-equipment.hbs",
    "systems/dnd5e/templates/items/details/details-facility.hbs",
    "systems/dnd5e/templates/items/details/details-feat.hbs",
    "systems/dnd5e/templates/items/details/details-loot.hbs",
    "systems/dnd5e/templates/items/details/details-mountable.hbs",
    "systems/dnd5e/templates/items/details/details-species.hbs",
    "systems/dnd5e/templates/items/details/details-spell.hbs",
    "systems/dnd5e/templates/items/details/details-spellcasting.hbs",
    "systems/dnd5e/templates/items/details/details-starting-equipment.hbs",
    "systems/dnd5e/templates/items/details/details-subclass.hbs",
    "systems/dnd5e/templates/items/details/details-tool.hbs",
    "systems/dnd5e/templates/items/details/details-weapon.hbs",
    "systems/dnd5e/templates/items/parts/item-summary.hbs",
    "systems/dnd5e/templates/items/parts/item-tooltip.hbs",
    "systems/dnd5e/templates/items/parts/spell-block.hbs",

    // Field Partials
    "systems/dnd5e/templates/shared/fields/field-activation.hbs",
    "systems/dnd5e/templates/shared/fields/field-damage.hbs",
    "systems/dnd5e/templates/shared/fields/field-duration.hbs",
    "systems/dnd5e/templates/shared/fields/field-range.hbs",
    "systems/dnd5e/templates/shared/fields/field-targets.hbs",
    "systems/dnd5e/templates/shared/fields/field-uses.hbs",
    "systems/dnd5e/templates/shared/fields/fieldlist.hbs",
    "systems/dnd5e/templates/shared/fields/formlist.hbs",

    // Journal Partials
    "systems/dnd5e/templates/journal/parts/journal-legacy-traits.hbs",
    "systems/dnd5e/templates/journal/parts/journal-modern-traits.hbs",
    "systems/dnd5e/templates/journal/parts/journal-table.hbs",

    // Activity Partials
    "systems/dnd5e/templates/activity/parts/activity-usage-notes.hbs",

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

  return foundry.applications.handlebars.loadTemplates(paths);
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
    if ( value === undefined ) continue;
    key = key.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (a, b) => (b ? "-" : "") + a.toLowerCase());
    entries.push(`data-${key}="${Handlebars.escapeExpression(value)}"`);
  }
  return new Handlebars.SafeString(entries.join(" "));
}

/* -------------------------------------------- */

/**
 * Create an icon element dynamically based on the provided icon string, supporting FontAwesome class strings
 * or paths to SVG or other image types.
 * @param {string} icon           Icon class or path.
 * @param {object} [options={}]
 * @param {string} [options.alt]  Alt text for the icon.
 * @returns {HTMLElement|null}
 */
export function generateIcon(icon, { alt }={}) {
  let element;
  if ( icon?.startsWith("fa") ) {
    element = document.createElement("i");
    element.className = icon;
  } else if ( icon ) {
    element = document.createElement(icon.endsWith(".svg") ? "dnd5e-icon" : "img");
    element.src = icon;
  } else {
    return null;
  }
  if ( alt ) element[element.tagName === "IMG" ? "alt" : "ariaLabel"] = alt;
  return element;
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
 * Construct an object from the provided arguments.
 * @param {object} options       Handlebars options.
 * @param {object} options.hash
 * @returns {object}
 */
function makeObject({ hash }) {
  return hash;
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
    "dnd5e-icon": (icon, { hash: options }) => {
      let element = generateIcon(icon, options);
      if ( !element && options.fallback ) element = generateIcon(options.fallback, options);
      return element ? new Handlebars.SafeString(element.outerHTML) : "";
    },
    "dnd5e-formatCR": formatCR,
    "dnd5e-formatModifier": formatModifier,
    "dnd5e-groupedSelectOptions": groupedSelectOptions,
    "dnd5e-itemContext": itemContext,
    "dnd5e-linkForUuid": (uuid, options) => linkForUuid(uuid, options.hash),
    "dnd5e-numberFormat": (context, options) => formatNumber(context, options.hash),
    "dnd5e-numberParts": (context, options) => formatNumberParts(context, options.hash),
    "dnd5e-object": makeObject,
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
    lhs.order || rhs.order ? (lhs.order ?? Infinity) - (rhs.order ?? Infinity)
      : lhs.name.localeCompare(rhs.name, game.i18n.lang)
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
 * @type {Record<string, Map<string, string>>}
 */
const _attributeLabelCache = {
  activity: new Map(),
  actor: new Map(),
  item: new Map()
};

/**
 * Convert an attribute path to a human-readable label. Assumes paths are on an actor unless an reference item
 * is provided.
 * @param {string} attr              The attribute path.
 * @param {object} [options]
 * @param {Actor5e} [options.actor]  An optional reference actor.
 * @param {Item5e} [options.item]    An optional reference item.
 * @returns {string|void}
 */
export function getHumanReadableAttributeLabel(attr, { actor, item }={}) {
  if ( attr.startsWith("system.") ) attr = attr.slice(7);

  // Check any actor-specific names first.
  if ( attr.match(/^resources\.(?:primary|secondary|tertiary)/) && actor ) {
    const key = attr.replace(/\.value$/, "");
    const resource = foundry.utils.getProperty(actor, `system.${key}`);
    if ( resource?.label ) return resource.label;
  }

  if ( (attr === "details.xp.value") && (actor?.type === "npc") ) {
    return game.i18n.localize("DND5E.ExperiencePoints.Value");
  }

  if ( attr.startsWith(".") && actor ) {
    // TODO: Remove `strict: false` when https://github.com/foundryvtt/foundryvtt/issues/11214 is resolved
    // Only necessary when opening the token config for an actor in a compendium
    const item = fromUuidSync(attr, { relative: actor, strict: false });
    return item?.name ?? attr;
  }

  // Check if the attribute is already in cache.
  let label = item ? null : _attributeLabelCache.actor.get(attr);
  if ( label ) return label;
  let name;
  let type = "actor";

  const getSchemaLabel = (attr, type, doc) => {
    if ( doc ) return doc.system.schema.getField(attr)?.label;
    for ( const model of Object.values(CONFIG[type].dataModels) ) {
      const field = model.schema.getField(attr);
      if ( field ) return field.label;
    }
  };

  // Activity labels
  if ( item && attr.startsWith("activities.") ) {
    let [, activityId, ...keyPath] = attr.split(".");
    const activity = item.system.activities?.get(activityId);
    if ( !activity ) return attr;
    attr = keyPath.join(".");
    name = `${item.name}: ${activity.name}`;
    type = "activity";
    if ( _attributeLabelCache.activity.has(attr) ) label = _attributeLabelCache.activity.get(attr);
    else if ( attr === "uses.spent" ) label = "DND5E.Uses";
  }

  // Item labels
  else if ( item ) {
    name = item.name;
    type = "item";
    if ( _attributeLabelCache.item.has(attr) ) label = _attributeLabelCache.item.get(attr);
    else if ( attr === "hd.spent" ) label = "DND5E.HitDice";
    else if ( attr === "uses.spent" ) label = "DND5E.Uses";
    else label = getSchemaLabel(attr, "Item", item);
  }

  // Derived fields.
  else if ( attr === "attributes.init.total" ) label = "DND5E.InitiativeBonus";
  else if ( (attr === "attributes.ac.value") || (attr === "attributes.ac.flat") ) label = "DND5E.ArmorClass";
  else if ( attr === "attributes.spell.dc" ) label = "DND5E.SpellDC";

  // Abilities.
  else if ( attr.startsWith("abilities.") ) {
    const [, key] = attr.split(".");
    label = game.i18n.format("DND5E.AbilityScoreL", { ability: CONFIG.DND5E.abilities[key].label });
  }

  // Resources
  else if ( attr === "resources.legact.spent" ) label = "DND5E.LegendaryAction.LabelPl";
  else if ( attr === "resources.legact.value" ) label = "DND5E.LegendaryAction.Remaining";
  else if ( attr === "resources.legres.spent" ) label = "DND5E.LegendaryResistance.LabelPl";
  else if ( attr === "resources.legres.value" ) label = "DND5E.LegendaryResistance.Remaining";

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
      const plurals = new Intl.PluralRules(game.i18n.lang, { type: "ordinal" });
      const level = Number(key.slice(5));
      label = game.i18n.format(`DND5E.SpellSlotsN.${plurals.select(level)}`, { n: level });
    }
  }

  // Currency
  else if ( attr.startsWith("currency.") ) {
    const [, key] = attr.split(".");
    label = CONFIG.DND5E.currencies[key]?.label;
  }

  // Attempt to find the attribute in a data model.
  if ( !label ) label = getSchemaLabel(attr, "Actor", actor);

  if ( label ) {
    label = game.i18n.localize(label);
    _attributeLabelCache[type].set(attr, label);
    if ( name ) label = `${name} ${label}`;
  }

  return label;
}

/* -------------------------------------------- */

/**
 * Perform pre-localization on the contents of a SchemaField. Necessary because the `localizeSchema` method
 * on `Localization` is private.
 * @param {SchemaField} schema
 * @param {string[]} prefixes
 */
export function localizeSchema(schema, prefixes) {
  foundry.helpers.Localization.localizeDataModel({ schema }, { prefixes });
}

/* -------------------------------------------- */

/**
 * Split a semi-colon-separated list and clean out any empty entries.
 * @param {string} input
 * @returns {string[]}
 */
export function splitSemicolons(input="") {
  return input.split(";").map(t => t.trim()).filter(t => t);
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
