import FormulaField from "../fields/formula-field.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing uses data.
 */
export default class UsesField extends SchemaField {
  constructor(options = {}) {
    const fields = {
      spent: new NumberField({ initial: 0, integer: true }),
      max: new FormulaField({ deterministic: true }),
      recovery: new ArrayField(
        new SchemaField({
          period: new StringField({ initial: "lr" }),
          type: new StringField({ initial: "recoverAll" }),
          formula: new FormulaField()
        })
      )
    };
    super(fields, options);
  }
}
