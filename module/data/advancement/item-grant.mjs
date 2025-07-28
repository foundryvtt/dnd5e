import SpellConfigurationData from "./spell-config.mjs";

const { ArrayField, BooleanField, EmbeddedDataField, SchemaField, StringField } = foundry.data.fields;

/**
 * Configuration data for an individual item provided by item grant.
 *
 * @typedef {object} ItemGrantItemConfiguration
 * @property {string} uuid       UUID of the item to grant.
 * @property {boolean} optional  Is this item optional? Has no effect if whole advancement is optional.
 */

/**
 * Configuration data for the Item Grant advancement.
 *
 * @property {ItemGrantItemConfiguration[]} items  Data for the items to be granted.
 * @property {boolean} optional                    Should user be able to de-select any individual option?
 * @property {SpellConfigurationData} spell        Data used to modify any granted spells.
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
        uuid: new StringField(),
        optional: new BooleanField()
      }), { required: true }),
      optional: new BooleanField({ required: true }),
      spell: new EmbeddedDataField(SpellConfigurationData, { required: true, nullable: true, initial: null })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
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
