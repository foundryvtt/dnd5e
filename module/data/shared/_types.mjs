/**
 * @import { BasicRollProcessConfiguration } from "../../dice/_types.mjs";
 */

/**
 * @typedef ActivationData
 * @property {string} type       Activation type (e.g. action, legendary action, minutes).
 * @property {number} value      Scalar value associated with the activation.
 * @property {string} condition  Condition required to activate this activity.
 */

/**
 * @typedef ActivationLabels
 * @property {string} simple  Activation label (e.g. "Action" or "1 Minute").
 * @property {string} legacy  Lowercase, always counted form (e.g. "1 action").
 * @property {string} ritual  Simple label, joined with "Ritual" if the item can be ritually cast.
 */

/**
 * @typedef CreatureTypeData
 * @property {string} value    Actor's type as defined in the system configuration.
 * @property {string} subtype  Actor's subtype usually displayed in parenthesis after main type.
 * @property {string} swarm    Size of the individual creatures in a swarm, if a swarm.
 * @property {string} custom   Custom type beyond what is available in the configuration.
 */

/**
 * @typedef CurrencyTemplateData
 * @property {Record<string, number>} currency  Currencies stored in the actor or container.
 */

/**
 * @typedef D20RollModificationData
 * @property {string} bonus  Bonus added to the roll.
 * @property {number} min    Minimum number on the die rolled.
 * @property {number} max    Maximum number on the die rolled.
 * @property {number} mode   Should the roll be with disadvantage or advantage by default?
 */

/**
 * @typedef DamageData
 * @property {number} number           Number of dice to roll.
 * @property {number} denomination     Die denomination to roll.
 * @property {string} bonus            Bonus added to the damage.
 * @property {Set<string>} types       One or more damage types. If multiple are selected, then the user will be able to
 *                                     select from those types.
 * @property {object} custom
 * @property {boolean} custom.enabled  Should the custom formula be used?
 * @property {string} custom.formula   Custom damage formula.
 * @property {Set<string>} modifiers   Modifiers to apply to damage roll.
 * @property {object} scaling
 * @property {string} scaling.mode     How the damage scales in relation with levels.
 * @property {number} scaling.number   Number of dice to add per scaling level.
 * @property {string} scaling.formula  Arbitrary scaling formula which will be multiplied by scaling increase.
 */

/**
 * @typedef DamageFormulaOptions
 * @property {Set<string>|false} modifiers  Additional modifiers to apply to the formula, if possible.
 *                                          A `false` value will remove modifiers provided by damage data.
 */

/**
 * @typedef DamageRollModificationData
 * @property {string} bonus  Bonus added to the roll.
 */

/**
 * @typedef DurationData
 * @property {string} value             Scalar value for the activity's duration.
 * @property {string} units             Units that are used for the duration.
 * @property {string} special           Description of any special duration details.
 */

/**
 * @typedef DurationLabels
 * @property {string} simple         Duration label (e.g. "Instantaneous" or "1 Minute").
 * @property {string} concentration  Simple label, wrapped in "Concentration, up to ..." where appropriate.
 */

/**
 * @typedef MovementData
 * @property {string} bonus                         Bonus applied to all movement types that already have a speed.
 * @property {number} multiplier                    Multiplier for each movement type.
 * @property {string} special                       Semi-colon separated list of special movement information.
 * @property {Record<string, string>} speeds        Speeds for various movement types.
 * @property {string} units                         Movement used to measure the various speeds.
 * @property {boolean} hover                        This flying creature able to hover in place.
 * @property {Set<string>} ignoredDifficultTerrain  Types of difficult terrain ignored.
 */

/**
 * @typedef RangeData
 * @property {string} value       Scalar value for the activity's range.
 * @property {string} units       Units that are used for the range.
 * @property {string} special     Description of any special range details.
 */

/**
 * @typedef RangeLabels
 * @property {string} simple       Range label (e.g. "Self" or "120 ft").
 * @property {string} html         Range label as HTML, with each number and unit part wrapped in its own span.
 * @property {string} description  Range label with the units spelled out (e.g. "120 feet").
 */

/**
 * @typedef RollConfigData
 * @property {string} ability    Default ability associated with this roll.
 * @property {D20RollModificationData} roll
 */

/**
 * @typedef RulesDetails
 * @property {string} category    Category of rules to retrieve (e.g. "attack" or "check").
 * @property {Actor5e} actor      Actor from which to fetch rules.
 * @property {Item5e} [item]      Item from which to fetch rules.
 * @property {RollData} rollData  Roll data with which to filter the rules.
 */

/**
 * @typedef SensesData
 * @property {Record<string, number} ranges  Ranges of various senses.
 * @property {string} units                  Distance units used to measure senses.
 * @property {string} special                Description of any special senses or restrictions.
 */

/**
 * @typedef SourceData
 * @property {string} book      Book/publication where the item originated.
 * @property {string} page      Page or section where the item can be found.
 * @property {string} custom    Fully custom source label.
 * @property {string} license   Type of license that covers this item.
 * @property {number} revision  Revision count for this item.
 * @property {string} rules     Version of the rules for this document (e.g. 2014 vs. 2024).
 */

/**
 * @typedef TargetData
 * @property {object} template
 * @property {string} template.count        Number of templates created.
 * @property {boolean} template.contiguous  Must all created areas be connected to one another?
 * @property {string} template.type         Type of area of effect caused by this activity.
 * @property {string} template.size         Size of the activity's area of effect on its primary axis.
 * @property {string} template.width        Width of line area of effect.
 * @property {string} template.height       Height of cylinder area of effect.
 * @property {string} template.units        Units used to measure the area of effect sizes.
 * @property {object} affects
 * @property {string} affects.count         Number of individual targets that can be affected.
 * @property {string} affects.type          Type of targets that can be affected (e.g. creatures, objects, spaces).
 * @property {boolean} affects.choice       When targeting an area, can the user choose who it affects?
 * @property {string} affects.special       Description of special targeting.
 */

/**
 * @typedef TargetLabels
 * @property {object} affects
 * @property {string} affects.description   Prose form used in descriptions (e.g. "each creature").
 * @property {string} affects.sheet         Capitalized short form used on sheets and inventory lists.
 * @property {string} affects.statblock     Counted form used in statblocks (e.g. "one creature").
 * @property {object} template
 * @property {string} template.description  Counted template label with its sizes (e.g. "20-foot Sphere").
 * @property {string} template.size         Template dimensions (e.g. "20-foot" or "10-foot-long, 5-foot-wide").
 * @property {string} template.statblock    Counted template label with its primary size (e.g. "20 ft sphere").
 * @property {string} template.type         Localized template type (e.g. "Sphere").
 */

/**
 * @typedef UsesData
 * @property {number} spent                 Number of uses that have been spent.
 * @property {string} max                   Formula for the maximum number of uses.
 * @property {UsesRecoveryData[]} recovery  Recovery profiles for this activity's uses.
 */

/**
 * @typedef UsesRecoveryData
 * @property {string} period   Period at which this profile is activated.
 * @property {string} type     Whether uses are reset to full, reset to zero, or recover a certain number of uses.
 * @property {string} formula  Formula used to determine recovery if type is not reset.
 */
