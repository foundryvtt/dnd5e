export default class ItemGrantConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      items: new foundry.data.fields.ArrayField(new foundry.data.fields.StringField(), {required: true}),
      optional: new foundry.data.fields.BooleanField({required: true}),
      spell: new foundry.data.fields.ObjectField({required: true})
    };
  }
}
