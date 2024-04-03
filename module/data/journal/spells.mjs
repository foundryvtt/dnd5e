import { IdentifierField } from "../fields.mjs";

const { HTMLField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data model for spell list data.
 *
 * @property {string} type               Type of spell list (e.g. class, subclass, race, etc.).
 * @property {string} identifier         Common identifier that matches the associated type (e.g. bard, cleric).
 * @property {string} grouping           Default grouping mode.
 * @property {object} description
 * @property {string} description.value  Description to display before spell list.
 * @property {Set<string>} spells        UUIDs of spells to display.
 */
export default class SpellListJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      type: new StringField({
        initial: "class", label: "JOURNALENTRYPAGE.DND5E.SpellList.Type.Label"
      }),
      identifier: new IdentifierField({label: "DND5E.Identifier"}),
      grouping: new StringField({
        initial: "level", choices: this.GROUPING_MODES,
        label: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.Label",
        hint: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.Hint"
      }),
      description: new SchemaField({
        value: new HTMLField({label: "DND5E.Description"})
      }),
      spells: new SetField(new StringField(), {label: "DND5E.ItemTypeSpellPl"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Different ways in which spells can be grouped on the sheet.
   * @enum {string}
   */
  static GROUPING_MODES = {
    none: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.None",
    alphabetical: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.Alphabetical",
    level: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.Level",
    school: "JOURNALENTRYPAGE.DND5E.SpellList.Grouping.School"
  };
}
