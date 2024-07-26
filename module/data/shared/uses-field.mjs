import FormulaField from "../fields/formula-field.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing uses data.
 */
export default class UsesField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      spent: new NumberField({ initial: 0, min: 0, integer: true }),
      max: new FormulaField({ deterministic: true }),
      recovery: new ArrayField(
        new SchemaField({
          period: new StringField({ initial: "lr" }),
          type: new StringField({ initial: "recoverAll" }),
          formula: new FormulaField()
        })
      ),
      ...fields
    };
    super(fields, options);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for the uses field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData
   */
  static prepareData(rollData) {
    // TODO: Move maximum uses preparation from `ActivatedEffectTemplate`
    this.uses.value = Math.clamp(this.uses.max - this.uses.spent, 0, this.uses.max);
  }
}
