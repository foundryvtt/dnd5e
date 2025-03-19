/**
 * @typedef AdvantageModeData
 * @property {number|null} override               Whether the mode has been entirely overridden.
 * @property {AdvantageModeCounts} advantages     The advantage counts.
 * @property {AdvantageModeCounts} disadvantages  The disadvantage counts.
 */

/**
 * @typedef AdvantageModeCounts
 * @property {number} count          The number of applications of this mode.
 * @property {boolean} [suppressed]  Whether this mode is suppressed.
 */

/**
 * @typedef {StringFieldOptions} FormulaFieldOptions
 * @property {boolean} [deterministic=false]  Is this formula not allowed to have dice values?
 */

/**
 * @typedef {StringFieldOptions} IdentifierFieldOptions
 * @property {string[]} [allowType=false]  Allow identifiers that are prefixed by type (e.g. `spell:mage-hand`).
 * @property {string[]} [types=null]       Item types that can be represented by this identifier.
 */

/**
 * @typedef {StringFieldOptions} LocalDocumentFieldOptions
 * @property {boolean} [fallback=false]  Display the string value if no matching item is found.
 */

/**
 * @typedef {DataFieldOptions} MappingFieldOptions
 * @property {string[]} [initialKeys]       Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [initialKeysOnly=false]  Should the keys in the initialized data be limited to the keys provided
 *                                              by `options.initialKeys`?
 */

/**
 * @callback MappingFieldInitialValueBuilder
 * @param {string} key       The key within the object where this new value is being generated.
 * @param {*} initial        The generic initial data provided by the contained model.
 * @param {object} existing  Any existing mapping data.
 * @returns {object}         Value to use as default for this key.
 */
