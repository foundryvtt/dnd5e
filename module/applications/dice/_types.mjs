/**
 * @import { BasicRollConfiguration, BasicRollProcessConfiguration } from "../../dice/basic-roll.mjs";
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
 * @typedef BasicRollConfigurationDialogRenderOptions
 * @property {object} [dice]
 * @property {number} [dice.max=5]               The maximum number of dice to display in the large dice breakdown. If
 *                                               the given rolls contain more dice than this, then the large breakdown
 *                                               is not shown.
 * @property {Set<string>} [dice.denominations]  Valid die denominations to display in the large dice breakdown. If any
 *                                               of the given rolls contain an invalid denomination, then the large
 *                                               breakdown is not shown.
 */

/**
 * @typedef {BasicRollConfigurationDialogOptions} AttackRollConfigurationDialogOptions
 * @property {FormSelectOption[]} ammunitionOptions  Ammunition that can be used with the attack.
 * @property {FormSelectOption[]} attackModeOptions  Different modes of attack.
 * @property {FormSelectOption[]} masteryOptions     Available masteries for the attacking weapon.
 */

/**
 * @typedef {BasicRollConfigurationDialogOptions} SkillToolRollConfigurationDialogOptions
 * @property {boolean} chooseAbility  Should the ability be selectable?
 */
