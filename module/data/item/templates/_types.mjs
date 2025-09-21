/**
 * @import { UnitValue5e } from "../../../_types.mjs";
 * @import { SourceData, UsesData } from "../../shared/_types.mjs";
 */

/**
 * @typedef ActivitiesTemplateData
 * @property {ActivityCollection} activities  Activities on this item.
 * @property {UsesData} uses                  Item's limited uses & recovery.
 */

/**
 * @typedef AdvancementTemplateData
 * @property {AdvancementCollection} advancement  Advancement objects for this item.
 */

/**
 * @typedef EquippableItemTemplateData
 * @property {string} attunement  Attunement information as defined in `DND5E.attunementTypes`.
 * @property {boolean} attuned    Is this item attuned on its owning actor?
 * @property {boolean} equipped   Is this item equipped on its owning actor?
 */

/**
 * @typedef IdentifiableTemplateData
 * @property {boolean} identified               Has this item been identified?
 * @property {object} unidentified
 * @property {string} unidentified.name         Name of the item when it is unidentified.
 * @property {string} unidentified.description  Description displayed if item is unidentified.
 */

/**
 * @typedef ItemDescriptionTemplateData
 * @property {object} description               Various item descriptions.
 * @property {string} description.value         Full item description.
 * @property {string} description.chat          Description displayed in chat card.
 * @property {string} identifier                Identifier slug for this item.
 * @property {SourceData} source                Adventure or sourcebook where this item originated.
 */

/**
 * @typedef MountableTemplateData
 * @property {number} cover               Amount of cover this item affords to its crew on a vehicle.
 * @property {object} crew
 * @property {number} crew.max            The number of crew this station can support.
 * @property {string[]} crew.value        The crew assigned to this station.
 * @property {object} hp
 * @property {number} hp.value            Current hit point value.
 * @property {number} hp.max              Max hit points.
 * @property {number} hp.dt               Damage threshold.
 * @property {string} hp.conditions       Conditions that are triggered when this equipment takes damage.
 * @property {object} speed
 * @property {string} speed.conditions    Conditions that may affect item's speed.
 * @property {number} speed.value         Speed granted by this piece of equipment measured in feet or meters
 *                                        depending on system setting.
 */

/**
 * @typedef PhysicalItemTemplateData
 * @property {string} container           Container within which this item is located.
 * @property {number} quantity            Number of items in a stack.
 * @property {UnitValue5e} weight         The Item's weight.
 * @property {object} price
 * @property {number} price.value         Item's cost in the specified denomination.
 * @property {string} price.denomination  Currency denomination used to determine price.
 * @property {string} rarity              Item rarity as defined in `DND5E.itemRarity`.
 */

/**
 * @typedef StartingEquipmentTemplateData
 * @property {EquipmentEntryData[]} startingEquipment  Different equipment entries that will be granted.
 * @property {string} wealth                           Formula used to determine starting wealth.
 */
