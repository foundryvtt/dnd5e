export default class ScaleValueConfigurationData extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      identifier: new foundry.data.fields.StringField({required: true, label: ""}),
      type: new foundry.data.fields.StringField({required: true, initial: "string", label: ""}),
      // TODO: Add type choices once #1688 is merged
      distance: new foundry.data.fields.SchemaField({
        units: new foundry.data.fields.StringField({
          required: true, blank: true, choices: CONFIG.DND5E.movementUnits, label: ""
        })
      }),
      scale: new foundry.data.fields.ObjectField({required: true, label: ""})
      // TODO: Switch to MappingField once main data models are merged
    };
  }
}
