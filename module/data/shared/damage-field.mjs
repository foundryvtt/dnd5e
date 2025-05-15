import Scaling from "../../documents/scaling.mjs";
import EmbeddedDataField5e from "../fields/embedded-data-field.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing damage data.
 */
export default class DamageField extends EmbeddedDataField5e {
  constructor(options) {
    super(DamageData, options);
  }
}

/* -------------------------------------------- */

/**
 * Data model that stores information on a single damage part.
 *
 * @property {number} number           Number of dice to roll.
 * @property {number} denomination     Die denomination to roll.
 * @property {string} bonus            Bonus added to the damage.
 * @property {Set<string>} types       One or more damage types. If multiple are selected, then the user will be able to
 *                                     select from those types.
 * @property {object} custom
 * @property {boolean} custom.enabled  Should the custom formula be used?
 * @property {string} custom.formula   Custom damage formula.
 * @property {object} scaling
 * @property {string} scaling.mode     How the damage scales in relation with levels.
 * @property {number} scaling.number   Number of dice to add per scaling level.
 * @property {string} scaling.formula  Arbitrary scaling formula which will be multiplied by scaling increase.
 */
export class DamageData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      number: new NumberField({ min: 0, integer: true }),
      denomination: new NumberField({ min: 0, integer: true }),
      bonus: new FormulaField(),
      types: new SetField(new StringField()),
      custom: new SchemaField({
        enabled: new BooleanField(),
        formula: new FormulaField()
      }),
      scaling: new SchemaField({
        mode: new StringField(),
        number: new NumberField({ initial: 1, min: 0, integer: true }),
        formula: new FormulaField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The default damage formula.
   * @type {string}
   */
  get formula() {
    if ( this.custom.enabled ) return this.custom.formula ?? "";
    return this._automaticFormula();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Produce the auto-generated formula from the `number`, `denomination`, and `bonus`.
   * @param {number} [increase=0]  Amount to increase the die count.
   * @returns {string}
   * @protected
   */
  _automaticFormula(increase=0) {
    let formula;
    const number = (this.number ?? 0) + increase;
    if ( number && this.denomination ) formula = `${number}d${this.denomination}`;
    if ( this.bonus ) formula = formula ? `${formula} + ${this.bonus}` : this.bonus;
    return formula ?? "";
  }

  /* -------------------------------------------- */

  /**
   * Scale the damage by a number of steps using its configured scaling configuration.
   * @param {number|Scaling} increase  Number of steps above base damage to scaling.
   * @returns {string}
   */
  scaledFormula(increase) {
    if ( increase instanceof Scaling ) increase = increase.increase;

    switch ( this.scaling.mode ) {
      case "whole": break;
      case "half": increase = Math.floor(increase * .5); break;
      default: increase = 0; break;
    }
    if ( !increase ) return this.formula;
    let formula;

    // If dice count scaling, increase the count on the first die rolled
    const dieIncrease = (this.scaling.number ?? 0) * increase;
    if ( this.custom.enabled ) {
      formula = this.custom.formula;
      formula = formula.replace(/^(\d)+d/, (match, number) => `${Number(number) + dieIncrease}d`);
    } else {
      formula = this._automaticFormula(dieIncrease);
    }

    // If custom scaling included, modify to match increase and append for formula
    if ( this.scaling.formula ) {
      let roll = new Roll(this.scaling.formula);
      roll = roll.alter(increase, 0, { multiplyNumeric: true });
      formula = formula ? `${formula} + ${roll.formula}` : roll.formula;
    }

    return formula;
  }

  /* -------------------------------------------- */

  /**
   * Step the die denomination up or down by a number of steps, sticking to proper die sizes. Will return `null` if
   * stepping reduced the denomination below minimum die size.
   * @param {number} [steps=1]  Number of steps to increase or decrease the denomination.
   * @returns {number|null}
   */
  steppedDenomination(steps=1) {
    return CONFIG.DND5E.dieSteps[Math.min(
      CONFIG.DND5E.dieSteps.indexOf(this.denomination) + steps,
      CONFIG.DND5E.dieSteps.length - 1
    )] ?? null;
  }
}
