import { prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing duration data.
 *
 * @property {string} value             Scalar value for the activity's duration.
 * @property {string} units             Units that are used for the duration.
 * @property {string} special           Description of any special duration details.
 */
export default class DurationField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      value: new FormulaField({ deterministic: true }),
      units: new StringField({ initial: "inst" }),
      special: new StringField(),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData  Roll data used for formula replacements.
   * @param {object} [labels]  Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    Object.defineProperty(this.duration, "scalar", {
      get() { return this.units in CONFIG.DND5E.scalarTimePeriods; },
      configurable: true
    });

    if ( this.duration.scalar ) {
      prepareFormulaValue(this, "duration.value", "DND5E.DURATION.FIELDS.duration.value.label", rollData);
    } else this.duration.value = null;

    if ( labels && this.duration.units ) {
      let duration = CONFIG.DND5E.timePeriods[this.duration.units] ?? "";
      if ( this.duration.value ) duration = `${this.duration.value} ${duration.toLowerCase()}`;
      labels.duration = duration;
      labels.concentrationDuration = this.properties?.has("concentration")
        ? game.i18n.format("DND5E.ConcentrationDuration", { duration }) : duration;
    }
  }
}
