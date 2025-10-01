/**
 * @typedef EffectApplicationData
 * @property {string} _id  ID of the effect to apply.
 * @property {object} level
 * @property {number} level.min  Minimum level at which this effect can be applied.
 * @property {number} level.max  Maximum level at which this effect can be applied.
 */

/**
 * @typedef ConsumptionTargetData
 * @property {string} type             Type of consumption (e.g. activity uses, item uses, hit die, spell slot).
 * @property {string} target           Target of the consumption depending on the selected type (e.g. item's ID, hit
 *                                     die denomination, spell slot level).
 * @property {string} value            Formula that determines amount consumed or recovered.
 * @property {object} scaling
 * @property {string} scaling.mode     Scaling mode (e.g. no scaling, scale target amount, scale spell level).
 * @property {string} scaling.formula  Specific scaling formula if not automatically calculated from target's value.
 */
