import { IdentifierField } from "../fields.mjs";

export default class ScaleValueConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      // TODO: Add type choices once #1688 is merged
      type: new foundry.data.fields.StringField({
        required: true, initial: "string", label: "DND5E.AdvancementScaleValueTypeLabel"
      }),
      distance: new foundry.data.fields.SchemaField({
        units: new foundry.data.fields.StringField({
          required: true, blank: true, choices: CONFIG.DND5E.movementUnits, label: "DND5E.MovementUnits"
        })
      }),
      // TODO: Switch to MappingField once main data models are merged
      scale: new foundry.data.fields.ObjectField({required: true})
    };
  }
}
