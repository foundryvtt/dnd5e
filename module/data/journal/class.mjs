/**
 * Data definition for Class Summary journal entry pages.
 *
 * @property {string} item                             UUID of the class item included.
 * @property {object} description
 * @property {string} description.value                Introductory description for the class.
 * @property {string} description.additionalHitPoints  Additional text displayed beneath the hit points section.
 * @property {string} description.additionalTraits     Additional text displayed beneath the traits section.
 * @property {string} description.additionalEquipment  Additional text displayed beneath the equipment section.
 * @property {string} description.subclass             Introduction to the subclass section.
 * @property {string} subclassHeader                   Subclass header to replace the default.
 * @property {Set<string>} subclassItems               UUIDs of all subclasses to display.
 */
export default class ClassJournalPageData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      item: new foundry.data.fields.StringField({required: true, label: "JOURNALENTRYPAGE.DND5E.Class.Item"}),
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.Description",
          hint: "JOURNALENTRYPAGE.DND5E.Class.DescriptionHint"
        }),
        additionalHitPoints: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalHitPoints",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalHitPointsHint"
        }),
        additionalTraits: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalTraits",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalTraitsHint"
        }),
        additionalEquipment: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.AdditionalEquipment",
          hint: "JOURNALENTRYPAGE.DND5E.Class.AdditionalEquipmentHint"
        }),
        subclass: new foundry.data.fields.HTMLField({
          label: "JOURNALENTRYPAGE.DND5E.Class.SubclassDescription",
          hint: "JOURNALENTRYPAGE.DND5E.Class.SubclassDescriptionHint"
        })
      }),
      subclassHeader: new foundry.data.fields.StringField({
        label: "JOURNALENTRYPAGE.DND5E.Class.SubclassHeader"
      }),
      subclassItems: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        label: "JOURNALENTRYPAGE.DND5E.Class.SubclassItems"
      })
    };
  }
}
