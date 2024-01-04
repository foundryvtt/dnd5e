import { MappingField } from "../fields.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

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

/**
 * A custom model to validate system flags on User Documents.
 *
 * @property {Record<string, SheetPreferences5e>} sheetPrefs  The User's sheet preferences.
 */
export default class UserSystemFlags extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      sheetPrefs: new MappingField(new SchemaField({
        width: new NumberField({ integer: true, positive: true }),
        height: new NumberField({ integer: true, positive: true }),
        tabs: new MappingField(new SchemaField({
          collapseSidebar: new BooleanField({ required: false }),
          group: new BooleanField({ required: false, initial: true }),
          sort: new StringField({ required: false, initial: "m", choices: foundry.documents.BaseFolder.SORTING_MODES })
        }))
      }))
    };
  }
}
