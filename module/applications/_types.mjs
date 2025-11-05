/**
 * @import { FilterDescription } from "../_types.mjs";
 * @import { SheetTabDescriptor5e } from "./api/_types.mjs";
 */

/**
 * @typedef AwardOptions
 * @property {Record<string, number>|null} currency  Amount of each currency to award.
 * @property {boolean} each                          Distribute full award to each destination, rather than dividing it
 *                                                   among the destinations.
 * @property {Set<string>} savedDestinations         Set of IDs for previously selected destinations.
 * @property {number|null} xp                        Amount of experience points to award.
 */

/**
 * @typedef {ApplicationConfiguration} CompendiumBrowserConfiguration
 * @property {{locked: CompendiumBrowserFilters, initial: CompendiumBrowserFilters}} filters  Filters to set to start.
 *                                              Locked filters won't be able to be changed by the user. Initial filters
 *                                              will be set to start but can be changed.
 * @property {CompendiumBrowserSelectionConfiguration} selection  Configuration used to define document selections.
 */

/**
 * @typedef CompendiumBrowserSelectionConfiguration
 * @property {number|null} min                  Minimum number of documents that must be selected.
 * @property {number|null} max                  Maximum number of documents that must be selected.
 */

/**
 * @typedef CompendiumBrowserFilters
 * @property {string} [documentClass]  Document type to fetch (e.g. Actor or Item).
 * @property {Set<string>} [types]     Individual document subtypes to filter upon (e.g. "loot", "class", "npc").
 * @property {object} [additional]     Additional type-specific filters applied.
 * @property {FilterDescription[]} [arbitrary]  Additional arbitrary filters to apply, not displayed in the UI.
 *                                     Only available as part of locked filters.
 * @property {string} [name]           A substring to filter by Document name.
 */

/**
 * Filter definition object for additional filters in the Compendium Browser.
 *
 * @typedef CompendiumBrowserFilterDefinitionEntry
 * @property {string} label                                   Localizable label for the filter.
 * @property {"boolean"|"range"|"set"} type                   Type of filter control to display.
 * @property {object} config                                  Type-specific configuration data.
 * @property {CompendiumBrowserCreateFilters} [createFilter]  Method that can be called to create filters.
 */

/**
 * @callback CompendiumBrowserFilterCreateFilters
 * @param {FilterDescription[]} filters                        Array of filters to be applied that should be mutated.
 * @param {*} value                                            Value of the filter.
 * @param {CompendiumBrowserFilterDefinitionEntry} definition  Definition for this filter.
 */

/**
 * @typedef {Map<string, CompendiumBrowserFilterDefinitionEntry>} CompendiumBrowserFilterDefinition
 */

/**
 * @typedef {SheetTabDescriptor5e} CompendiumBrowserTabDescriptor5e
 * @property {string} documentClass  The class of Documents this tab contains.
 * @property {string[]} [types]      The sub-types of Documents this tab contains, otherwise all types of the Document
 *                                   class are assumed.
 * @property {boolean} [advanced]    Is this tab only available in the advanced browsing mode.
 */

/**
 * Description for a single part of a property attribution.
 *
 * @typedef PropertyAttributionDescription
 * @property {string} label               Descriptive label that will be displayed. If the label is in the form
 *                                        of an @ property, the system will try to turn it into a human-readable label.
 * @property {number} mode                Application mode for this step as defined in
 *                           [CONST.ACTIVE_EFFECT_MODES](https://foundryvtt.com/api/module-constants.html#.ACTIVE_EFFECT_MODES).
 * @property {number} value               Value of this step.
 * @property {ActiveEffect5e} [document]  Active effect applying this attribution, if any.
 */
