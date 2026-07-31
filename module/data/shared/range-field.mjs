import { formatLength, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * @import { ActivityRollData, ItemRollData } from "../../documents/_types.mjs";
 * @import { RangeData, RangeLabels } from "./_types.mjs";
 */

/**
 * Field for storing range data.
 */
export default class RangeField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      value: new FormulaField({ deterministic: true }),
      units: new StringField({ required: true, blank: false, initial: "self" }),
      special: new StringField(),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Build the display labels for range data.
   * @param {object} data            Data from which to build the labels.
   * @param {RangeData} data.range   Resolved range data.
   * @returns {Partial<RangeLabels>}
   */
  static getLabels({ range }) {
    const labels = {};
    if ( !range?.units ) {
      labels.simple = _loc("DND5E.DistSelf");
      return labels;
    }
    const isScalar = range.units in CONFIG.DND5E.movementUnits;
    if ( isScalar && range.value ) {
      labels.simple = formatLength(range.value, range.units);
      labels.html = formatLength(range.value, range.units, { parts: true });
      labels.description = formatLength(range.value, range.units, { unitDisplay: "long" });
    } else if ( !isScalar ) {
      labels.simple = CONFIG.DND5E.distanceUnits[range.units];
    }
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
    this.range.scalar = this.range.units in CONFIG.DND5E.movementUnits;
    if ( this.range.scalar ) {
      prepareFormulaValue(this, "range.value", "DND5E.RANGE.FIELDS.range.value.label", rollData);
    } else this.range.value = null;

    this.range.labels ??= {};
    Object.assign(this.range.labels, RangeField.getLabels(this));

    if ( labels ) {
      labels.description ??= {};
      labels.description.range ||= this.range.labels.description;
      labels.range ||= this.range.labels.simple;
      labels.rangeParts ||= this.range.labels.html;
    }
  }
}
