import { formatTime, prepareFormulaValue } from "../../utils.mjs";
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
      units: new StringField({ required: true, blank: false, initial: "inst" }),
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
    this.duration.scalar = this.duration.units in CONFIG.DND5E.scalarTimePeriods;
    if ( this.duration.scalar ) {
      prepareFormulaValue(this, "duration.value", "DND5E.DURATION.FIELDS.duration.value.label", rollData);
    } else this.duration.value = null;

    if ( labels && this.duration.units ) {
      if ( this.duration.value && (this.duration.units in CONFIG.DND5E.timeUnits) ) {
        labels.duration = formatTime(this.duration.value, this.duration.units);
      } else labels.duration = CONFIG.DND5E.timePeriods[this.duration.units] ?? "";
      labels.concentrationDuration = this.duration.concentration || this.properties?.has("concentration")
        ? game.i18n.format("DND5E.ConcentrationDuration", { duration: labels.duration }) : labels.duration;
    }

    Object.defineProperty(this.duration, "getEffectData", {
      value: DurationField.getEffectDuration.bind(this.duration),
      configurable: true
    });
  }

  /* -------------------------------------------- */

  /**
   * Create duration data usable for an active effect based on this duration.
   * @this {DurationData}
   * @returns {EffectDurationData}
   */
  static getEffectDuration() {
    if ( !Number.isNumeric(this.value) ) return {};
    switch ( this.units ) {
      case "turn": return { turns: this.value };
      case "round": return { rounds: this.value };
      case "minute": return { seconds: this.value * 60 };
      case "hour": return { seconds: this.value * 60 * 60 };
      case "day": return { seconds: this.value * 60 * 60 * 24 };
      case "year": return { seconds: this.value * 60 * 60 * 24 * 365 };
      default: return {};
    }
  }
}
