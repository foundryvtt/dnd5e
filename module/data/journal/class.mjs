export default class ClassJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      itemUUID: new foundry.data.fields.StringField({required: true, label: ""}),
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: ""}),
        additionalHitPoints: new foundry.data.fields.HTMLField({label: ""}),
        additionalTraits: new foundry.data.fields.HTMLField({label: ""}),
        additionalEquipment: new foundry.data.fields.HTMLField({label: ""}),
        subclass: new foundry.data.fields.HTMLField({label: ""})
      }, { label: "" })
    };
  }
}
