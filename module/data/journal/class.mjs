export default class ClassJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      itemUUID: new foundry.data.fields.StringField({required: true, label: "JOURNALENTRYPAGE.DND5E.Class.Item"}),
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.Description",
          hint: "JOURNALENTRYPAGE.DND5E.Class.DescriptionHint"}),
        additionalHitPoints: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalHitPoints",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalHitPointsHint"}),
        additionalTraits: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalTraits",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalTraitsHint"}),
        additionalEquipment: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalEquipment",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalEquipmentHint"}),
        subclass: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.SubclassDescription",
          hint: "JOURNALENTRYPAGE.DND5E.Class.SubclassDescriptionHint"})
      }),
      subclassHeader: new foundry.data.fields.StringField({
        label: "JOURNALENTRYPAGE.DND5E.Class.SubclassHeader"}),
      subclassItems: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        label: "JOURNALENTRYPAGE.DND5E.Class.SubclassItems"})
    };
  }
}
