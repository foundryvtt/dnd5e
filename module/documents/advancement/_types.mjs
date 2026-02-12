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
 * @typedef AdvancementApplicationData
 */

/* -------------------------------------------- */

/**
 * @typedef AdvancementApplicationOptions
 * @property {boolean} [automatic]  This application is part of an automatic application.
 * @property {boolean} [initial]    This application is the initial application before the flow is first rendered.
 */

/* -------------------------------------------- */

/**
 * @typedef AdvancementRestorationOptions
 */

/* -------------------------------------------- */

/**
 * @typedef AdvancementReversalOptions
 */

/* -------------------------------------------- */

/**
 * @typedef {AdvancementApplicationData} AbilityScoreImprovementAdvancementApplicationData
 * @property {Record<string, number>} [assignments]    Changes to specific ability scores.
 * @property {Record<string, object>} [retainedItems]  Item data grouped by UUID.
 * @property {"asi"|"feat"} [type]                     Type of ASI being handled.
 * @property {string} [uuid]                           UUID of the feat item to add.
 */

/* -------------------------------------------- */

/**
 * @typedef {ItemGrantAdvancementApplicationData} ItemChoiceAdvancementApplicationData
 * @property {Record<number, Record<string, Item5e>>} previousItems  Copies of items added at earlier levels.
 * @property {string} [replace]                       ID of the item being replaced.
 * @property {ItemChoiceRetainedData} [retainedData]  Retained data including replacement data.
 */

/**
 * @typedef {ItemGrantRetainedData} ItemChoiceRetainedData
 * @property {object} [replaced]  Details on item replacement.
 */

/**
 * @typedef {ItemGrantAdvancementReversalOptions} ItemChoiceAdvancementReversalOptions
 * @property {boolean} [clearReplacement]  Clear the replacement and restore the original item.
 * @property {Record<number, Record<string, Item5e>>} previousItems  Copies of items added at earlier levels.
 * @property {boolean} [skipEvaluation]    Do not re-evaluate other item selected at this level.
 */

/* -------------------------------------------- */

/**
 * @typedef {AdvancementApplicationData} ItemGrantAdvancementApplicationData
 * @property {string} [ability]     Selected ability for added spells.
 * @property {ItemGrantRetainedData} [retainedData]  Retained item data grouped by UUID and selected ability. If item
 *                                  data is present, it will be used rather than fetching new data from the source.
 * @property {string[]} [selected]  UUIDs of items to add. If none provided, then will fall back to the items
 *                                  provided in the `items` object.
 */

/**
 * @typedef ItemGrantRetainedData
 * @property {string} [ability]  Selected ability.
 * @property {object[]} [items]  Data for retained items.
 */

/**
 * @typedef {AdvancementReversalOptions} ItemGrantAdvancementReversalOptions
 * @property {string} [uuid]  UUID of a single item to remove.
 */

/* -------------------------------------------- */

/**
 * @typedef {AdvancementApplicationData} SubclassAdvancementApplicationData
 * @property {object} [retainedData]  Retained data object for a previous subclass.
 * @property {string} [uuid]          UUID of subclass to add.
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

/* -------------------------------------------- */

/**
 * @typedef {AdvancementApplicationData} TraitAdvancementApplicationData
 * @property {string[]} [chosen]  Array of trait keys to add.
 * @property {string} [key]       Key of a single trait to add.
 */

/* -------------------------------------------- */

/**
 * @typedef {AdvancementReversalOptions} TraitAdvancementReversalOptions
 * @property {string} [key]  Key of a single trait to remove.
 */
