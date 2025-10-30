const { HTMLField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ClassJournalSystemPageData } from "./_types.mjs";
 */

/**
 * Data definition for Class Summary journal entry pages.
 * @extends {foundry.abstract.TypeDataModel<ClassJournalSystemPageData>}
 * @mixes ClassJournalSystemPageData
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
