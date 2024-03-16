import { MappingField } from "../fields.mjs";
import SpellConfigurationData from "./spell-config.mjs";

export default class ItemChoiceConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      hint: new foundry.data.fields.StringField({label: "DND5E.AdvancementHint"}),
      choices: new MappingField(new foundry.data.fields.NumberField(), {
        hint: "DND5E.AdvancementItemChoiceLevelsHint"
      }),
      allowDrops: new foundry.data.fields.BooleanField({
        initial: true, label: "DND5E.AdvancementConfigureAllowDrops",
        hint: "DND5E.AdvancementConfigureAllowDropsHint"
      }),
      type: new foundry.data.fields.StringField({
        blank: false, nullable: true, initial: null,
        label: "DND5E.AdvancementItemChoiceType", hint: "DND5E.AdvancementItemChoiceTypeHint"
      }),
      pool: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
        uuid: new foundry.data.fields.StringField()
      }), {label: "DOCUMENT.Items"}),
      spell: new foundry.data.fields.EmbeddedDataField(SpellConfigurationData, {nullable: true, initial: null}),
      restriction: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({label: "DND5E.Type"}),
        subtype: new foundry.data.fields.StringField({label: "DND5E.Subtype"}),
        level: new foundry.data.fields.StringField({label: "DND5E.SpellLevel"})
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    if ( "pool" in source ) {
      source.pool = source.pool.map(i => foundry.utils.getType(i) === "string" ? { uuid: i } : i);
    }
    return source;
  }
}
