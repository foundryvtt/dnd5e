import SpellConfigurationData from "./spell-config.mjs";

const { ArrayField, BooleanField, EmbeddedDataField, IntegerSortField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ItemGrantAdvancementConfigurationData } from "./_types.mjs";
 */

/**
 * Configuration data for the Item Grant advancement.
 * @extends {foundry.abstract.DataModel<ItemGrantAdvancementConfigurationData>}
 * @mixes ItemGrantAdvancementConfigurationData
 */
export default class ItemGrantConfigurationData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ItemGrant", "DND5E.ADVANCEMENT.SPELLCONFIG"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      items: new ArrayField(new SchemaField({
        optional: new BooleanField(),
        sort: new IntegerSortField(),
        uuid: new StringField()
      }), { required: true }),
      optional: new BooleanField({ required: true }),
      sorting: new StringField({ initial: "m", choices: Folder.SORTING_MODES }),
      spell: new EmbeddedDataField(SpellConfigurationData, { required: true, nullable: true, initial: null })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( "items" in source ) {
      source.items = source.items.map(i => foundry.utils.getType(i) === "string" ? { uuid: i } : i);
    }
    if ( source.spell ) SpellConfigurationData.migrateData(source.spell);
    return source;
  }
}
