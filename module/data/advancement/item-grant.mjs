import SpellConfigurationData from "./spell-config.mjs";

export default class ItemGrantConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      items: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField(), {
        required: true, label: "DOCUMENT.Items"
      }),
      optional: new foundry.data.fields.BooleanField({
        required: true, label: "DND5E.AdvancementItemGrantOptional", hint: "DND5E.AdvancementItemGrantOptionalHint"
      }),
      spell: new foundry.data.fields.EmbeddedDataField(SpellConfigurationData, {
        required: true, nullable: true, initial: null
      })
    };
  }
}
