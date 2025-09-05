import FormulaField from "../fields/formula-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @typedef DamageRollModificationData
 * @property {string} bonus  Bonus added to the roll.
 */

/**
 * Field for storing modifications on a damage roll.
 */
export default class DamageRollModificationField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      bonus: new FormulaField(),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { required: false, ...options });
  }
}
