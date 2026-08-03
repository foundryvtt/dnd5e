import { formatTime, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ActivityRollData, ItemRollData } from "../../documents/_types.mjs";
 * @import { DurationData, DurationLabels } from "./_types.mjs";
 */

/**
 * Field for storing duration data.
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
   * Build the display labels for duration data.
   * @param {object} data                    Data from which to build the labels.
   * @param {DurationData} data.duration     Resolved duration data.
   * @param {Set<string>} [data.properties]  Item properties.
   * @returns {Partial<DurationLabels>}
   */
  static getLabels({ duration, properties }) {
    if ( !duration?.units ) return {};
    const labels = {};
    if ( duration.value && (duration.units in CONFIG.DND5E.timeUnits) ) {
      labels.simple = formatTime(duration.value, duration.units);
    } else {
      labels.simple = CONFIG.DND5E.timePeriods[duration.units] ?? "";
    }
    labels.concentration = duration.concentration || properties?.has?.("concentration")
      ? _loc("DND5E.CONCENTRATION.Duration", { duration: labels.simple }) : labels.simple;
    return labels;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {ItemRollData|ActivityRollData} rollData  Roll data used for formula replacements.
   * @param {object} [labels]                         Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    this.duration.scalar = this.duration.units in CONFIG.DND5E.scalarTimePeriods;
    if ( this.duration.scalar ) {
      prepareFormulaValue(this, "duration.value", "DND5E.DURATION.FIELDS.duration.value.label", rollData);
    } else this.duration.value = null;

    if ( labels && this.duration.units ) {
      const { concentration, simple } = DurationField.getLabels(this);
      labels.duration = simple;
      labels.concentrationDuration = concentration;
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
    const { value, units } = this;
    switch ( units ) {
      case "turn": return { value, units: "turns" };
      case "round": return { value, units: "rounds" };
      case "second": return { value, units: "seconds" };
      case "minute": return { value, units: "minutes" };
      case "hour": return { value, units: "hours" };
      case "day": return { value, units: "days" };
      case "month": return { value, units: "months" };
      case "year": return { value, units: "years" };
      default: return {};
    }
  }
}
