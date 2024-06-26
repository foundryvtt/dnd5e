const { HTMLField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data definition for Subclass Summary journal entry pages.
 *
 * @property {string} item               UUID of the subclass item included.
 * @property {object} description
 * @property {string} description.value  Introductory description for the subclass.
 * @property {string} style              Force the page style to use modern or legacy formatting, rather than what
 *                                       is specified by the subclass.
 */
export default class SubclassJournalPageData extends foundry.abstract.TypeDataModel {

  /** @inheritDoc */
  static LOCALIZATION_PREFIXES = ["JOURNALENTRYPAGE.DND5E.Subclass"];

  /* -------------------------------------------- */
  /** @inheritDoc */
  static defineSchema() {
    return {
      item: new StringField({ required: true }),
      description: new SchemaField({
        value: new HTMLField({ textSearch: true })
      }),
      style: new StringField()
    };
  }
}
