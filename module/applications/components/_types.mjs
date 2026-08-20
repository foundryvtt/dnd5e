/**
 * @import { DamageApplicationOptions, DamageCalc } from "../../documents/_types.mjs";
 * @import RecordedTargetsElement from "./recorded-targets.mjs";
 */

/**
 * @typedef InventorySectionDescriptor
 * @property {string} id                                     The section identifier.
 * @property {number} order                                  Sections are displayed in ascending order of this value.
 * @property {Record<string, string>} groups                 Group identifiers that this section belongs to.
 * @property {string} label                                  The name of the section. Will be localized.
 * @property {number} [minWidth=200]                         The minimum width of the primary column in this section.
 *                                                           If the section is resized such that the primary column
 *                                                           would be smaller than this width, secondary columns are
 *                                                           hidden in order to retain this minimum.
 * @property {(string|InventoryColumnDescriptor)[]} columns  A list of column descriptors or IDs of well-known columns.
 * @property {Record<string, string>} [dataset]              Section data stored in the DOM.
 */

/**
 * @typedef InventoryColumnDescriptor
 * @property {string} id        The column identifier.
 * @property {string} template  The handlebars template used to render the column.
 * @property {number} width     The amount of pixels of width allocated to represent this column.
 * @property {number} order     Columns are displayed from left-to-right in ascending order of this value.
 * @property {number} priority  Columns with a higher priority take precedence when there is not enough space to
 *                              display all columns.
 */

/**
 * @typedef FilterState5e
 * @property {string} name             Filtering by name.
 * @property {Set<string>} properties  Filtering by some property.
 */

/**
 * @callback ItemListComparator5e
 * @param {Item5e} a
 * @param {Item5e} b
 * @returns {number}
 */

/**
 * @typedef ListControlDescriptor
 * @property {string} key                        A key to identify the option.
 * @property {string} label                      A human-readable label that describes the option.
 * @property {string} [icon]                     Font Awesome icon classes to represent the option.
 * @property {string} [classes]                  CSS classes to apply when the option is active.
 * @property {Record<string, string>} [dataset]  The above properties packed into a dataset for rendering.
 */

/**
 * @typedef ListControlConfiguration
 * @property {string} label                     The placeholder value to use in the main search box.
 * @property {string} list                      The identifier of the item list associated with these controls.
 * @property {ListControlDescriptor[]} filters  Filter configuration.
 * @property {ListControlDescriptor[]} sorting  Sorting configuration.
 * @property {ListControlDescriptor[]} grouping Grouping configuration.
 */

/**
 * @callback RecordedTargetEntryCallback
 * @param {RecordedTargetsElement} element  The parent recorded targets element.
 * @param {object} data                     Data about the entry.
 * @param {string} data.name                The entry's name.
 * @param {string} data.uuid                The entry's UUID.
 * @returns {HTMLLIElement|null|void}
 */

/**
 * @callback TargetPillMenuCallback
 * @param {HTMLElement} pill  The target pill element.
 * @param {HTMLElement} menu  The menu being built.
 */

/**
 * @callback TargetPillMenuEntryCallback
 * @param {HTMLElement} pill                                         The target pill element.
 * @param {{ checked: boolean, name: string, uuid: string }} target  Target data.
 * @returns {HTMLElement|void}
 */

/**
 * @callback TargetPillMenuEntryClickCallback
 * @param {HTMLElement} pill    The target pill element.
 * @param {PointerEvent} event  The triggering event.
 */

/**
 * @typedef TargetPillMenuState
 * @property {DamageCalc|null} [calc]                   The current damage calculation.
 * @property {TargetPillElement|null} [group]           The target pill representing the group of targets.
 * @property {DamageApplicationOptions|null} [options]  Options which adjust damage calculation.
 * @property {string[]} targets                         The targets in the group.
 */
