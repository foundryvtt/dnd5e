/**
 * @typedef UserSystemFlagsData
 * @property {Set<string>} awardDestinations                  Saved targets from previous use of /award command.
 * @property {object} creation
 * @property {string} creation.scrollExplanation              Default explanation mode for spell scrolls.
 * @property {Record<string, SheetPreferences5e>} sheetPrefs  The User's sheet preferences.
 */

/**
 * @typedef {object} SheetPreferences5e
 * @property {number|null} width                      The preferred width of the sheet.
 * @property {number|null} height                     The preferred height of the sheet.
 * @property {Record<string, TabPreferences5e>} tabs  The User's tab preferences.
 */

/**
 * @typedef {object} TabPreferences5e
 * @property {boolean} [collapseSidebar]  Whether this tab should have the sidebar collapsed.
 * @property {boolean} [group]            Whether to group items by type.
 * @property {string} [sort]              The item sort mode.
 */
