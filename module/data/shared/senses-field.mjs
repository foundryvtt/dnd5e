const { NumberField, StringField } = foundry.data.fields;

/**
 * Field for storing senses data.
 */
export default class SensesField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    const numberConfig = { required: true, nullable: true, integer: true, min: 0, initial: null };
    fields = {
      darkvision: new NumberField({ ...numberConfig, label: "DND5E.SenseDarkvision" }),
      blindsight: new NumberField({ ...numberConfig, label: "DND5E.SenseBlindsight" }),
      tremorsense: new NumberField({ ...numberConfig, label: "DND5E.SenseTremorsense" }),
      truesight: new NumberField({ ...numberConfig, label: "DND5E.SenseTruesight" }),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.SenseUnits"
      }),
      special: new StringField({ required: true, label: "DND5E.SenseSpecial" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Senses", ...options });
  }
}
