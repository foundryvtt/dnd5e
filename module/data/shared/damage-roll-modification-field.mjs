import FormulaField from "../fields/formula-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing modifications on a damage roll.
 */
export default class DamageRollModificationField extends SchemaField {
  constructor(fields={}, { labelPrefix="DND5E.ROLL.Generic.Damage.", ...options }={}) {
    fields = {
      bonus: new FormulaField({ label: `${labelPrefix}bonus.label` }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { required: false, ...options });
  }
}
