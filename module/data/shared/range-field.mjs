import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing range data.
 *
 * @property {string} value                Scalar value for the activity's range.
 * @property {string} units                Units that are used for the range.
 * @property {string} special              Description of any special range details.
 */
export default class RangeField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      value: new FormulaField({ deterministic: true }),
      units: new StringField(),
      special: new StringField(),
      ...fields
    };
    super(fields, options);
  }
}
