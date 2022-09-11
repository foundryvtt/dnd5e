import { AdvancementDataField } from "../fields.mjs";

export default class BaseAdvancement extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      _id: new foundry.data.fields.DocumentIdField({initial: () => foundry.utils.randomID(), label: ""}),
      type: new foundry.data.fields.StringField({required: true, label: ""}),
      title: new foundry.data.fields.StringField({initial: undefined, label: ""}),
      icon: new foundry.data.fields.FilePathField({initial: undefined, categories: ["IMAGE"], label: ""}),
      level: new foundry.data.fields.NumberField({integer: true, initial: 1, min: 0, label: ""}),
      configuration: new AdvancementDataField(this, {required: true, label: ""}),
      value: new AdvancementDataField(this, {required: true, label: ""})
    };
  }
}
