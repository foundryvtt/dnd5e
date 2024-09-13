const { HTMLField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Class Summary journal entry pages.
 *
 * @property {string} item                             UUID of the class item included.
 * @property {object} description
 * @property {string} description.value                Introductory description for the class.
 * @property {string} description.additionalHitPoints  Additional text displayed beneath the hit points section.
 * @property {string} description.additionalTraits     Additional text displayed beneath the traits section.
 * @property {string} description.additionalEquipment  Additional text displayed beneath the equipment section.
 * @property {string} description.subclass             Introduction to the subclass section.
 * @property {string} style                            Force the page style to use modern or legacy formatting, rather
 *                                                     than what is specified by the class.
 * @property {string} subclassHeader                   Subclass header to replace the default.
 * @property {Set<string>} subclassItems               UUIDs of all subclasses to display.
 */
export default class ClassJournalPageData extends foundry.abstract.TypeDataModel {

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = ["JOURNALENTRYPAGE.DND5E.Class"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      item: new StringField({ required: true }),
      description: new SchemaField({
        value: new HTMLField({ textSearch: true }),
        additionalHitPoints: new HTMLField({ textSearch: true }),
        additionalTraits: new HTMLField({ textSearch: true }),
        additionalEquipment: new HTMLField({ textSearch: true }),
        subclass: new HTMLField({ textSearch: true })
      }),
      style: new StringField(),
      subclassHeader: new StringField({ textSearch: true }),
      subclassItems: new SetField(new StringField())
    };
  }
}
