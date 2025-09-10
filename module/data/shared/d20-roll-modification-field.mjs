import AdvantageModeField from "../fields/advantage-mode-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @typedef D20RollModificationData
 * @property {string} bonus  Bonus added to the roll.
 * @property {number} min    Minimum number on the die rolled.
 * @property {number} max    Maximum number on the die rolled.
 * @property {number} mode   Should the roll be with disadvantage or advantage by default?
 */

/**
 * Field for storing modifications on a roll.
 */
export default class D20RollModificationField extends SchemaField {
  constructor(fields={}, options={}) {
    const opts = { initial: null, nullable: true, min: 1, max: 20, integer: true };
    fields = {
      bonus: new FormulaField(),
      min: new NumberField({ ...opts, label: "DND5E.ROLL.Range.Minimum" }),
      max: new NumberField({ ...opts, label: "DND5E.ROLL.Range.Maximum" }),
      mode: new AdvantageModeField(),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { required: false, ...options });
  }
}
