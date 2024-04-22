import { IdentifierField } from "../fields.mjs";
import SourceField from "../shared/source-field.mjs";

const { ArrayField, DocumentIdField, HTMLField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data needed to display spells that aren't able to be linked (outside SRD & current module).
 *
 * @typedef {object} UnlinkedSpellConfiguration
 * @property {string} _id            Unique ID for this entry.
 * @property {string} name           Name of the spell.
 * @property {object} system
 * @property {number} system.level   Spell level.
 * @property {string} system.school  Spell school.
 * @property {object} source
 * @property {string} source.book    Book/publication where the spell originated.
 * @property {string} source.page    Page or section where the spell can be found.
 * @property {string} source.custom  Fully custom source label.
 * @property {string} source.uuid    UUID of the spell, if available in another module.
 */

/**
 * Data model for spell list data.
 *
 * @property {string} type               Type of spell list (e.g. class, subclass, race, etc.).
 * @property {string} identifier         Common identifier that matches the associated type (e.g. bard, cleric).
 * @property {string} grouping           Default grouping mode.
 * @property {object} description
 * @property {string} description.value  Description to display before spell list.
 * @property {Set<string>} spells        UUIDs of spells to display.
 * @property {UnlinkedSpellConfiguration[]} unlinkedSpells  Unavailable spells that are entered manually.
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
      spells: new SetField(new StringField(), {label: "DND5E.ItemTypeSpellPl"}),
      unlinkedSpells: new ArrayField(new SchemaField({
        _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
        name: new StringField({label: "Name"}),
        system: new SchemaField({
          level: new NumberField({min: 0, integer: true, label: "DND5E.Level"}),
          school: new StringField({label: "DND5E.School"})
        }),
        source: new SourceField({license: false, uuid: new StringField()})
      }), {label: "JOURNALENTRYPAGE.DND5E.SpellList.UnlinkedSpells.Label"})
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
