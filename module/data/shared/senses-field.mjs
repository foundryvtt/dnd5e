const { NumberField, StringField } = foundry.data.fields;

/**
 * Field for storing senses data.
 */
export default class SensesField extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const numberConfig = { required: true, nullable: true, integer: true, min: 0, initial: null };
    const senses = Object.entries(CONFIG.DND5E.senses).reduce((acc, [k, label]) => {
      acc[k] = new NumberField({ ...numberConfig, label });
      return acc;
    }, {});
    fields = {
      ...senses,
      units: new StringField({
        required: true, nullable: true, blank: false, initial: null, label: "DND5E.SenseUnits"
      }),
      special: new StringField({ required: true, label: "DND5E.SenseSpecial" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Senses", ...options });
  }
}
