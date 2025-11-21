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
 * @typedef FavoriteData5e
 * @property {string} img                  The icon path.
 * @property {string} title                The title.
 * @property {string|string[]} [subtitle]  An optional subtitle or several subtitle parts.
 * @property {number} [value]              A single value to display.
 * @property {number} [quantity]           The item's quantity.
 * @property {string|number} [modifier]    A modifier associated with the item.
 * @property {number} [passive]            A passive score associated with the item.
 * @property {object} [range]              The item's range.
 * @property {number} [range.value]        The first range increment.
 * @property {number|null} [range.long]    The second range increment.
 * @property {string} [range.units]        The range units.
 * @property {object} [save]               The item's saving throw.
 * @property {string} [save.ability]       The saving throw ability.
 * @property {number} [save.dc]            The saving throw DC.
 * @property {object} [uses]               Data on an item's uses.
 * @property {number} [uses.value]         The current available uses.
 * @property {number} [uses.max]           The maximum available uses.
 * @property {string} [uses.name]          The property to update on the item. If none is provided, the property will
 *                                         not be updatable.
 * @property {boolean} [toggle]            The effect's toggle state.
 * @property {boolean} [suppressed]        Whether the favorite is suppressed.
 */

/**
 * @typedef SystemDataModelMetadata
 * @property {typeof DataModel} [systemFlagsModel]  Model that represents flags data within the dnd5e namespace.
 */
