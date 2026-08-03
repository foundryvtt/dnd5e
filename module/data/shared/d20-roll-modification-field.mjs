import AppliedRules from "../../documents/applied-rules.mjs";
import AdvantageModeField from "../fields/advantage-mode-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

/**
 * @import { RulesDetails } from "./_types.mjs";
 */

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
        label: `${labelPrefix}bonus.label`, labelFormatter: `${labelFormatterPrefix}Bonus`
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
   * Combine data from multiple roll modification fields to produce final advantage, bonus, and range values.
   * @param {DataModel} model                          The model containing the fields.
   * @param {string[]} keyPaths                        Paths to the individual fields to combine within the model.
   * @param {Partial<AdvantageModeData>} [options={}]  External sources of advantage or disadvantage.
   * @param {RulesDetails} [options.rules]             Data used to fetch rules.
   * @returns {{ advantage: boolean, disadvantage: boolean, bonus: string, maximum: number, minimum: number }}
   */
  static combineFields(model, keyPaths, { rules={}, ...options }={}) {
    let maximum = Infinity;
    let minimum = -Infinity;
    const parts = [];
    for ( const kp of keyPaths ) {
      const data = foundry.utils.getProperty(model, kp) ?? {};
      maximum = Math.min(maximum, data.max ?? Infinity);
      minimum = Math.max(minimum, data.min ?? -Infinity);
      if ( data.bonus ) parts.push(data.bonus);
    }
    const { advantage, disadvantage } = AdvantageModeField.combineFields(
      model, keyPaths.map(kp => `${kp}.mode`), rules.actor
        ? D20RollModificationField.#makeRulesIterator("advantage", rules).toAdvantageCounts(options) : options
    );
    return {
      advantage, disadvantage,
      bonus: rules.actor
        ? D20RollModificationField.#makeRulesIterator("bonus", rules).toFormula(parts)
        : parts.join(" + "),
      maximum: rules.actor
        ? D20RollModificationField.#makeRulesIterator("maximum", rules).resolve(rules.rollData).toSmallest(maximum)
        : maximum,
      minimum: rules.actor
        ? D20RollModificationField.#makeRulesIterator("minimum", rules).resolve(rules.rollData).toLargest(minimum)
        : minimum
    };
  }

  /* -------------------------------------------- */

  /**
   * Helper to create a rules iterator from a category and the provided rules configuration.
   * @param {string} type         Rules type to fetch (e.g. "advantage" or "bonus").
   * @param {RulesDetails} rules  Data used to configure the rules object.
   */
  static #makeRulesIterator(type, rules) {
    return AppliedRules.collect(`${rules.category}:${type}`, rules.actor, rules.item).filterWith(rules.rollData);
  }
}
