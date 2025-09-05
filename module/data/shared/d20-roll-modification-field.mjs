import AdvantageModeField from "../fields/advantage-mode-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing modifications on a roll.
 */
export default class D20RollModificationField extends SchemaField {
  constructor(fields={}, options={}) {
    const opts = { initial: null, nullable: true, min: 1, max: 20, integer: true };
    fields = {
      bonus: new FormulaField({ label: "DND5E.ROLL.Bonus", labelFomatter: `${labelFormatterPrefix}Bonus` }),
      min: new NumberField({
        ...opts, label: "DND5E.ROLL.Range.Minimum", labelFormatter: `${labelFormatterPrefix}Minimum`
      }),
      max: new NumberField({
        ...opts, label: "DND5E.ROLL.Range.Maximum", labelFormatter: `${labelFormatterPrefix}Maximum`
      }),
      mode: new AdvantageModeField({ labelFormatter: `${labelFormatterPrefix}AdvantageMode` }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { required: false, ...options });
  }
}
