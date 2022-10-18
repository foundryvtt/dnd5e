import { MappingField } from "../fields.mjs";
import SpellConfigurationData from "./spell-config.mjs";

export default class ItemChoiceConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      hint: new foundry.data.fields.StringField({label: "DND5E.AdvancementHint"}),
      choices: new MappingField(new foundry.data.fields.NumberField(), {
        required: true, hint: "DND5E.AdvancementItemChoiceLevelsHint"
      }),
      allowDrops: new foundry.data.fields.BooleanField({
        required: true, initial: true, label: "DND5E.AdvancementConfigureAllowDrops",
        hint: "DND5E.AdvancementConfigureAllowDropsHint"
      }),
      type: new foundry.data.fields.StringField({
        required: true, blank: false, nullable: true, initial: null,
        label: "DND5E.AdvancementItemChoiceType", hint: "DND5E.AdvancementItemChoiceTypeHint"
      }),
      pool: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField(), {
        required: true, label: "DOCUMENT.Items"
      }),
      spell: new foundry.data.fields.EmbeddedDataField(SpellConfigurationData, {
        required: true, nullable: true, initial: null
      })
    };
  }
}
