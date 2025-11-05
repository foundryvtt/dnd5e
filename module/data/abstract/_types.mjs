/**
 * @import { InventorySectionDescriptor } from "../../applications/components/_types.mjs";
 */

/**
 * @typedef {SystemDataModelMetadata} ActorDataModelMetadata
 * @property {boolean} supportsAdvancement  Can advancement be performed for this actor type?
 */

/**
 * @typedef ChatMessageDataModelMetadata
 * @property {Record<string, ApplicationClickAction>} actions  Default click actions for buttons on the message.
 * @property {string} template                                 Template to use when rendering this message.
 */

/**
 * @typedef {SystemDataModelMetadata} ItemDataModelMetadata
 * @property {boolean} enchantable    Can this item be modified by enchantment effects?
 * @property {boolean} hasEffects     Display the effects tab on this item's sheet.
 * @property {boolean} singleton      Should only a single item of this type be allowed on an actor?
 * @property {InventorySectionDescriptor} [inventory]  Configuration for displaying this item type in its own section
 *                                                     in creature inventories.
 */

/**
 * @typedef SystemDataModelMetadata
 * @property {typeof DataModel} [systemFlagsModel]  Model that represents flags data within the dnd5e namespace.
 */
