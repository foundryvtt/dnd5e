const { HTMLField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { SubclassJournalPageSystemData } from "./_types.mjs";
 */

/**
 * Data definition for Subclass Summary journal entry pages.
 * @extends {foundry.abstract.TypeDataModel<SubclassJournalPageSystemData>}
 * @mixes SubclassJournalPageSystemData
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
