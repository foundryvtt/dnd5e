/**
 * @import { BasicRollProcessConfiguration } from "../../dice/basic-roll.mjs";
 */

/**
 * @typdef ActivationData
 * @property {string} type       Activation type (e.g. action, legendary action, minutes).
 * @property {number} value      Scalar value associated with the activation.
 * @property {string} condition  Condition required to activate this activity.
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
 * @typedef DamageData
 * @property {number} number           Number of dice to roll.
 * @property {number} denomination     Die denomination to roll.
 * @property {string} bonus            Bonus added to the damage.
 * @property {Set<string>} types       One or more damage types. If multiple are selected, then the user will be able to
 *                                     select from those types.
 * @property {object} custom
 * @property {boolean} custom.enabled  Should the custom formula be used?
 * @property {string} custom.formula   Custom damage formula.
 * @property {object} scaling
 * @property {string} scaling.mode     How the damage scales in relation with levels.
 * @property {number} scaling.number   Number of dice to add per scaling level.
 * @property {string} scaling.formula  Arbitrary scaling formula which will be multiplied by scaling increase.
 */

/**
 * @typedef DurationData
 * @property {string} value             Scalar value for the activity's duration.
 * @property {string} units             Units that are used for the duration.
 * @property {string} special           Description of any special duration details.
 */

/**
 * @typedef MovementData
 * @property {number} burrow                        Actor burrowing speed.
 * @property {number} climb                         Actor climbing speed.
 * @property {number} fly                           Actor flying speed.
 * @property {number} swim                          Actor swimming speed.
 * @property {number} walk                          Actor walking speed.
 * @property {string} special                       Semi-colon separated list of special movement information.
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
 * @typedef RollConfigData
 * @property {string} [ability]  Default ability associated with this roll.
 * @property {object} roll
 * @property {number} roll.min   Minimum number on the die rolled.
 * @property {number} roll.max   Maximum number on the die rolled.
 * @property {number} roll.mode  Should the roll be with disadvantage or advantage by default?
 */

/**
 * @typedef SensesData
 * @property {number} darkvision       Creature's darkvision range.
 * @property {number} blindsight       Creature's blindsight range.
 * @property {number} tremorsense      Creature's tremorsense range.
 * @property {number} truesight        Creature's truesight range.
 * @property {string} units            Distance units used to measure senses.
 * @property {string} special          Description of any special senses or restrictions.
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

/**
 * @typedef {BasicRollProcessConfiguration} RechargeRollProcessConfiguration
 * @property {boolean} [apply=true]  Apply the uses updates back to the item or activity.
 */
