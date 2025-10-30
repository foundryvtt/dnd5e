import MappingField from "../fields/mapping-field.mjs";
import SpellConfigurationData from "./spell-config.mjs";

const {
  ArrayField, BooleanField, EmbeddedDataField, ForeignDocumentField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { ItemChoiceAdvancementConfigurationData, ItemChoiceAdvancementValueData } from "./_types.mjs";
 */

/**
 * Configuration data for Item Choice advancement.
 * @extends {foundry.abstract.DataModel<ItemChoiceAdvancementConfigurationData>}
 * @mixes ItemChoiceAdvancementConfigurationData
 */
export class ItemChoiceConfigurationData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ItemChoice", "DND5E.ADVANCEMENT.SPELLCONFIG"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      allowDrops: new BooleanField({ initial: true }),
      choices: new MappingField(new SchemaField({
        count: new NumberField({integer: true, min: 0}),
        replacement: new BooleanField()
      })),
      pool: new ArrayField(new SchemaField({ uuid: new StringField() })),
      restriction: new SchemaField({
        level: new StringField(),
        list: new SetField(new StringField()),
        subtype: new StringField(),
        type: new StringField()
      }),
      spell: new EmbeddedDataField(SpellConfigurationData, { nullable: true, initial: null }),
      type: new StringField({ blank: false, nullable: true, initial: null })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( "choices" in source ) Object.entries(source.choices).forEach(([k, c]) => {
      if ( foundry.utils.getType(c) === "number" ) source.choices[k] = { count: c };
    });
    if ( "pool" in source ) {
      source.pool = source.pool.map(i => foundry.utils.getType(i) === "string" ? { uuid: i } : i);
    }
    if ( source.spell ) SpellConfigurationData.migrateData(source.spell);
    return source;
  }
}

/**
 * Value data for Item Choice advancement.
 * @extends {foundry.abstract.DataModel<ItemChoiceAdvancementValueData>}
 * @mixes ItemChoiceAdvancementValueData
 */
export class ItemChoiceValueData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ability: new StringField(),
      added: new MappingField(new MappingField(new StringField())),
      replaced: new MappingField(new SchemaField({
        level: new NumberField({integer: true, min: 0}),
        original: new ForeignDocumentField(foundry.documents.BaseItem, {idOnly: true}),
        replacement: new ForeignDocumentField(foundry.documents.BaseItem, {idOnly: true})
      }))
    };
  }
}
