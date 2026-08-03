/**
 * @typedef ACFormulaData
 * @property {boolean|null} armored   Require character be armored or not armored to use this formula.
 * @property {string} formula         Formula to use to calculate armor class.
 * @property {string} label           Label used for calculation in the attribution tooltip & config dialog.
 * @property {boolean|null} shielded  Require character to have a shield or not have a shield to use this formula.
 */

/**
 * @typedef SimpleTraitData
 * @property {Set<string>} value  Keys for currently selected traits.
 * @property {string} custom      Semicolon-separated list of custom traits.
 */

/**
 * @typedef {SimpleTraitData} DamageTraitData
 * @property {Set<string>} bypasses  Keys for physical weapon properties that cause resistances to be bypassed.
 */

/**
 * @typedef TravelData
 * @property {TravelPace5e} [pace]            Current travel pace.
 * @property {Record<string, string>} paces   Formulas for various travel paces per/day.
 * @property {Record<string, string>} speeds  Formulas for various travel speeds per/hour.
 * @property {string} units                   Movement used to measure the various travel speeds.
 */

/**
 * @typedef {"slow"|"normal"|"fast"} TravelPace5e
 */
