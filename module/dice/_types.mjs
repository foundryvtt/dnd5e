/**
 * @import { TravelPace5e } from "../data/actor/fields/_types.mjs";
 */

/**
 * Configuration data for the process of creating one or more basic rolls.
 *
 * @typedef BasicRollProcessConfiguration
 * @property {BasicRollConfiguration[]} rolls  Configuration data for individual rolls.
 * @property {boolean} [evaluate=true]         Should the rolls be evaluated? If set to `false`, then no chat message
 *                                             will be created regardless of message configuration.
 * @property {Event} [event]                   Event that triggered the rolls.
 * @property {string[]} [hookNames]            Name suffixes for configuration hooks called.
 * @property {Document} [subject]              Document that initiated this roll.
 * @property {number} [target]                 Default target value for all rolls.
 */

/**
 * Configuration data for an individual roll.
 *
 * @typedef BasicRollConfiguration
 * @property {string[]} [parts=[]]         Parts used to construct the roll formula.
 * @property {object} [data={}]            Data used to resolve placeholders in the formula.
 * @property {boolean} [situational=true]  Whether the situational bonus can be added to this roll in the prompt.
 * @property {BasicRollOptions} [options]  Additional options passed through to the created roll.
 */

/**
 * Options allowed on a basic roll.
 *
 * @typedef BasicRollOptions
 * @property {number} [target]  The total roll result that must be met for the roll to be considered a success.
 */

/**
 * Configuration data for the process of rolling d20 rolls.
 *
 * @typedef {BasicRollProcessConfiguration} D20RollProcessConfiguration
 * @property {boolean} [advantage]             Apply advantage to each roll.
 * @property {boolean} [disadvantage]          Apply disadvantage to each roll.
 * @property {boolean} [elvenAccuracy]         Use three dice when rolling with advantage.
 * @property {boolean} [halflingLucky]         Add a re-roll once modifier to the d20 die.
 * @property {boolean} [reliableTalent]        Set the minimum for the d20 roll to 10.
 * @property {D20RollConfiguration[]} rolls    Configuration data for individual rolls.
 */

/**
 * D20 roll configuration data.
 *
 * @typedef {BasicRollConfiguration} D20RollConfiguration
 * @property {string[]} parts          Parts used to construct the roll formula, not including the d20 die.
 * @property {D20RollOptions} options  Options passed through to the roll.
 */

/**
 * Options that describe a d20 roll.
 *
 * @typedef {BasicRollOptions} D20RollOptions
 * @property {boolean} [advantage]       Does this roll potentially have advantage?
 * @property {boolean} [disadvantage]    Does this roll potentially have disadvantage?
 * @property {D20Roll.ADV_MODE} [advantageMode]  Final advantage mode.
 * @property {number} [criticalSuccess]  The value of the d20 die to be considered a critical success.
 * @property {number} [criticalFailure]  The value of the d20 die to be considered a critical failure.
 * @property {boolean} [elvenAccuracy]   Use three dice when rolling with advantage.
 * @property {boolean} [halflingLucky]   Add a re-roll once modifier to the d20 die.
 * @property {number} [maximum]          Maximum number the d20 die can roll.
 * @property {number} [minimum]          Minimum number the d20 die can roll.
 */

/**
 * @typedef {D20RollProcessConfiguration} AbilityRollProcessConfiguration
 * @property {string} [ability]  ID of the ability to roll as found in `CONFIG.DND5E.abilities`.
 */

/**
 * @typedef {D20RollProcessConfiguration} AttackRollProcessConfiguration
 * @property {Item5e|boolean} [ammunition]    Specific ammunition to consume, or `false` to prevent any ammo usage.
 * @property {WeaponAttackMode} [attackMode]  Mode to use for making the attack and rolling damage.
 * @property {string} [mastery]               Weapon mastery option to use.
 */

/**
 * @typedef {"oneHanded"|"twoHanded"|"offhand"|"thrown"|"thrown-offhand"} WeaponAttackMode
 */

/**
 * @typedef {D20RollOptions} InitiativeRollOptions
 * @property {D20Roll.ADV_MODE} [advantageMode]  A specific advantage mode to apply.
 * @property {number} [fixed]                    Fixed initiative value to use rather than rolling.
 * @property {string} [flavor]                   Special flavor text to apply to the created message.
 */

/**
 * @typedef {D20RollProcessConfiguration} SkillToolRollProcessConfiguration
 * @property {string} [ability]     The ability to be rolled with the skill.
 * @property {string} [bonus]       Additional bonus term added to the check.
 * @property {Item5e} [item]        Tool item used for rolling.
 * @property {string} [skill]       The skill to roll.
 * @property {string} [tool]        The tool to roll.
 * @property {TravelPace5e} [pace]  Whether a travel pace is being applied to the roll.
 */

/**
 * Configuration data for the process of rolling a damage roll.
 *
 * @typedef {BasicRollProcessConfiguration} DamageRollProcessConfiguration
 * @property {DamageRollConfiguration[]} rolls         Configuration data for individual rolls.
 * @property {CriticalDamageConfiguration} [critical]  Critical configuration for all rolls.
 * @property {boolean} [isCritical]                    Treat each roll as a critical unless otherwise specified.
 * @property {number} [scaling=0]                      Scale increase above base damage.
 */

/**
 * Damage roll configuration data.
 *
 * @typedef {BasicRollConfiguration} DamageRollConfiguration
 * @property {DamageRollOptions} [options] - Options passed through to the roll.
 */

/**
 * Options that describe a damage roll.
 *
 * @typedef {BasicRollOptions} DamageRollOptions
 * @property {boolean} [isCritical]                    Should critical damage be calculated for this roll?
 * @property {CriticalDamageConfiguration} [critical]  Critical configuration for this roll.
 * @property {string[]} [properties]                   Physical properties of the source (e.g. magical, silvered).
 * @property {string} [type]                           Type of damage represented.
 * @property {string[]} [types]                        List of damage types selectable in the configuration app. If no
 *                                                     type is provided, then the first of these types will be used.
 */

/**
 * Critical effects configuration data.
 *
 * @typedef CriticalDamageConfiguration
 * @property {boolean} [allow=true]       Should critical damage be allowed?
 * @property {number} [multiplier=2]      Amount by which to multiply critical damage.
 * @property {number} [bonusDice=0]       Additional dice added to first term when calculating critical damage.
 * @property {string} [bonusDamage]       Additional, unmodified, damage formula added when calculating a critical.
 * @property {boolean} [multiplyDice]     Should dice result be multiplied rather than number of dice rolled increased?
 * @property {boolean} [multiplyNumeric]  Should numeric terms be multiplied along side dice during criticals?
 * @property {string} [powerfulCritical]  Maximize result of extra dice added by critical, rather than rolling.
 */

/**
 * @typedef {BasicRollProcessConfiguration} HitDieRollProcessConfiguration
 * @property {string} [denomination]  The denomination of hit die to roll with the leading letter (e.g. `d8`).
 *                                    If no denomination is provided, the first available hit die will be used.
 * @property {boolean} [modifyHitDice=true]    Should the actor's spent hit dice count be updated?
 * @property {boolean} [modifyHitPoints=true]  Should the actor's hit points be updated after the roll?
 */

/**
 * @typedef {BasicRollProcessConfiguration} RechargeRollProcessConfiguration
 * @property {boolean} [apply=true]  Apply the uses updates back to the item or activity.
 */

/* -------------------------------------------- */

/**
 * Configuration data for the roll prompt.
 *
 * @typedef BasicRollDialogConfiguration
 * @property {boolean} [configure=true]  Display a configuration dialog for the rolling process.
 * @property {typeof RollConfigurationDialog} [applicationClass]  Alternate configuration application to use.
 * @property {BasicRollConfigurationDialogOptions} [options]      Additional options passed to the dialog.
 */

/**
 * Dialog rendering options for a roll configuration dialog.
 *
 * @typedef BasicRollConfigurationDialogOptions
 * @property {typeof BasicRoll} rollType              Roll type to use when constructing final roll.
 * @property {object} [default]
 * @property {number} [default.rollMode]              Default roll mode to have selected.
 * @property {RollBuildConfigCallback} [buildConfig]  Callback to handle additional build configuration.
 * @property {BasicRollConfigurationDialogRenderOptions} [rendering]
 */

/**
 * @callback RollBuildConfigCallback
 * @param {BasicRollProcessConfiguration} process  Configuration for the entire rolling process.
 * @param {BasicRollConfiguration} config          Configuration for a specific roll.
 * @param {FormDataExtended} [formData]            Any data entered into the rolling prompt.
 * @param {number} index                           Index of the roll within all rolls being prepared.
 */

/**
 * @typedef {BasicRollDialogConfiguration} AttackRollDialogConfiguration
 * @property {AttackRollConfigurationDialogOptions} [options]  Configuration options.
 */

/**
 * @typedef {BasicRollConfigurationDialogOptions} AttackRollConfigurationDialogOptions
 * @property {FormSelectOption[]} ammunitionOptions  Ammunition that can be used with the attack.
 * @property {FormSelectOption[]} attackModeOptions  Different modes of attack.
 * @property {FormSelectOption[]} masteryOptions     Available masteries for the attacking weapon.
 */

/**
 * @typedef {BasicRollDialogConfiguration} SkillToolRollDialogConfiguration
 * @property {SkillToolRollConfigurationDialogOptions} [options]  Configuration options.
 */

/**
 * @typedef {BasicRollConfigurationDialogOptions} SkillToolRollConfigurationDialogOptions
 * @property {boolean} chooseAbility  Should the ability be selectable?
 */

/* -------------------------------------------- */

/**
 * Configuration data for creating a roll message.
 *
 * @typedef BasicRollMessageConfiguration
 * @property {boolean} [create=true]     Create a message when the rolling is complete.
 * @property {ChatMessage5e} [document]  Final created chat message document once process is completed.
 * @property {string} [rollMode]         The roll mode to apply to this message from `CONFIG.Dice.rollModes`.
 * @property {object} [data={}]          Additional data used when creating the message.
 */
