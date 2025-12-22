import { formatLength, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

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
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData  Roll data used for formula replacements.
   * @param {object} [labels]  Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    this.range.scalar = this.range.units in CONFIG.DND5E.movementUnits;
    if ( this.range.scalar ) {
      prepareFormulaValue(this, "range.value", "DND5E.RANGE.FIELDS.range.value.label", rollData);
    } else this.range.value = null;

    this.range.labels ??= {};
    if ( this.range.units ) {
      if ( this.range.scalar && this.range.value ) {
        this.range.labels.range = formatLength(this.range.value, this.range.units);
        this.range.labels.rangeParts = formatLength(this.range.value, this.range.units, { parts: true });
        this.range.labels.description = formatLength(this.range.value, this.range.units, { unitDisplay: "long" });
      } else if ( !this.range.scalar ) {
        this.range.labels.range = CONFIG.DND5E.distanceUnits[this.range.units];
      }
    } else this.range.labels.range = game.i18n.localize("DND5E.DistSelf");

    if ( labels ) {
      labels.description ??= {};
      labels.description.range ||= this.range.labels.description;
      labels.range ||= this.range.labels.range;
      labels.rangeParts ||= this.range.labels.rangeParts;
    }
  }
}
