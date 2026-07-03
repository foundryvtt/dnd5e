import AdvantageModeField from "../fields/advantage-mode-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing modifications on a roll.
 */
export default class D20RollModificationField extends SchemaField {
  constructor(fields={}, {
    labelPrefix="DND5E.ROLL.Generic.D20.", labelFormatterPrefix="DND5E.ROLL.Formatter.", ...options
  }={}) {
    const opts = { initial: null, nullable: true, min: 1, max: 20, integer: true };
    fields = {
      bonus: new FormulaField({
        label: `${labelPrefix}bonus.label`, labelFomatter: `${labelFormatterPrefix}Bonus`
      }),
      min: new NumberField({
        ...opts, label: `${labelPrefix}min.label`, labelFormatter: `${labelFormatterPrefix}Minimum`
      }),
      max: new NumberField({
        ...opts, label: `${labelPrefix}max.label`, labelFormatter: `${labelFormatterPrefix}Maximum`
      }),
      mode: new AdvantageModeField({
        label: `${labelPrefix}mode.label`, labelFormatter: `${labelFormatterPrefix}AdvantageMode`
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { required: false, ...options });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Combine data from multiple roll modification fields to produce final advantage and range values.
   * @param {DataModel} model                 The model containing the fields.
   * @param {string[]} keyPaths               Paths to the individual fields to combine within the model.
   * @param {object} [options={}]
   * @param {number} [options.advantages]     External sources of advantage.
   * @param {number} [options.disadvantages]  External sources of disadvantage.
   * @returns {{ advantage: boolean, disadvantage: boolean, maximum: number, minimum: number }}
   */
  static combineFields(model, keyPaths, options={}) {
    let maximum = Infinity;
    let minimum = -Infinity;
    for ( const kp of keyPaths ) {
      const data = foundry.utils.getProperty(model, kp) ?? {};
      maximum = Math.min(maximum, data.max ?? Infinity);
      minimum = Math.max(minimum, data.min ?? -Infinity);
    }
    const { advantage, disadvantage } = AdvantageModeField.combineFields(
      model, keyPaths.map(kp => `${kp}.mode`), options
    );
    return { advantage, disadvantage, maximum, minimum };
  }
}
