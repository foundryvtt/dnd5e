/**
 * @import { PseudoDocumentsMetadata } from "../mixins/_types.mjs";
 */

/**
 * Information on how an advancement type is configured.
 *
 * @typedef {PseudoDocumentsMetadata} AdvancementMetadata
 * @property {object} dataModels
 * @property {DataModel} configuration  Data model used for validating configuration data.
 * @property {DataModel} value          Data model used for validating value data.
 * @property {number} order          Number used to determine default sorting order of advancement items.
 * @property {string} icon           Icon used for this advancement type if no user icon is specified.
 * @property {string} typeIcon       Icon used when selecting this advancement type during advancement creation.
 * @property {string} title          Title to be displayed if no user title is specified.
 * @property {string} hint           Description of this type shown in the advancement selection dialog.
 * @property {boolean} multiLevel    Can this advancement affect more than one level? If this is set to true,
 *                                   the level selection control in the configuration window is hidden and the
 *                                   advancement should provide its own implementation of `Advancement#levels`
 *                                   and potentially its own level configuration interface.
 * @property {Set<string>} validItemTypes  Set of types to which this advancement can be added. (deprecated)
 * @property {object} apps
 * @property {*} apps.config         Subclass of AdvancementConfig that allows for editing of this advancement type.
 * @property {*} apps.flow           Subclass of AdvancementFlow that is displayed while fulfilling this advancement.
 */

/* -------------------------------------------- */

/**
 * The advancement configuration is flattened into separate options for the user that are chosen step-by-step. Some
 * are automatically picked for them if they are 'grants' or if there is only one option after the character's
 * existing traits have been taken into account.
 *
 * @typedef TraitChoices
 * @property {"grant"|"choice"} type  Whether this trait is automatically granted or is chosen from some options.
 * @property {number} [choiceIdx]     An index that groups each separate choice into the groups that they originally
 *                                    came from.
 * @property {SelectChoices} choices  The available traits to pick from. Grants have only 0 or 1, depending on whether
 *                                    the character already has the granted trait.
 */
