export default class AdvancementData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      _id: new foundry.data.fields.DocumentIdField({initial: () => foundry.utils.randomID(), label: ""}),
      type: new foundry.data.fields.StringField({required: true, label: ""}),
      title: new foundry.data.fields.StringField({label: ""}),
      icon: new foundry.data.fields.FilePathField({categories: ["IMAGE"], label: ""}),
      level: new foundry.data.fields.NumberField({integer: true, initial: 1, min: 0, label: ""}),
      configuration: new foundry.data.fields.SchemaField({}, {required: true, label: ""}),
      value: new foundry.data.fields.SchemaField({}, {required: true, label: ""})
    };
  }
}
