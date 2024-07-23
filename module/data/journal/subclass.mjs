const { HTMLField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data definition for Subclass Summary journal entry pages.
 *
 * @property {string} item               UUID of the subclass item included.
 * @property {object} description
 * @property {string} description.value  Introductory description for the subclass.
 */
export default class SubclassJournalPageData extends foundry.abstract.TypeDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      item: new StringField({required: true, label: "JOURNALENTRYPAGE.DND5E.Subclass.Item"}),
      description: new SchemaField({
        value: new HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.Description",
          hint: "JOURNALENTRYPAGE.DND5E.Class.DescriptionHint"
        })
      })
    };
  }
}
