/**
 * Field for storing senses data.
 */
export default class SensesField extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const numberConfig = { required: true, nullable: false, integer: true, min: 0, initial: 0 };
    fields = {
      darkvision: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.SenseDarkvision" }),
      blindsight: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.SenseBlindsight" }),
      tremorsense: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.SenseTremorsense" }),
      truesight: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.SenseTruesight" }),
      units: new foundry.data.fields.StringField({required: true, initial: "ft", label: "DND5E.SenseUnits"}),
      special: new foundry.data.fields.StringField({required: true, label: "DND5E.SenseSpecial"}),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Senses", ...options });
  }
}
