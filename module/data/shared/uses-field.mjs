import { formatNumber, formatRange, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data for a recovery profile for an activity's uses.
 *
 * @typedef {object} UsesRecoveryData
 * @property {string} period   Period at which this profile is activated.
 * @property {string} type     Whether uses are reset to full, reset to zero, or recover a certain number of uses.
 * @property {string} formula  Formula used to determine recovery if type is not reset.
 */

/**
 * Field for storing uses data.
 *
 * @property {number} spent                 Number of uses that have been spent.
 * @property {string} max                   Formula for the maximum number of uses.
 * @property {UsesRecoveryData[]} recovery  Recovery profiles for this activity's uses.
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
   * Prepare data for this field. Should be called during the `prepareFinalData` stage.
   * @this {ItemDataModel|BaseActivityData}
   * @param {object} rollData  Roll data used for formula replacements.
   * @param {object} [labels]  Object in which to insert generated labels.
   */
  static prepareData(rollData, labels) {
    prepareFormulaValue(this, "uses.max", "DND5E.USES.FIELDS.uses.max.label", rollData);
    this.uses.value = Math.clamp(this.uses.max - this.uses.spent, 0, this.uses.max);

    const periods = [];
    for ( const recovery of this.uses.recovery ) {
      if ( recovery.period === "recharge" ) {
        recovery.type = "recoverAll";
        recovery.recharge = {
          options: Array.fromRange(5, 2).reverse().map(min => ({
            value: min,
            label: game.i18n.format("DND5E.USES.Recovery.Recharge.Range", {
              range: min === 6 ? formatNumber(6) : formatRange(min, 6)
            })
          }))
        };
        if ( labels ) labels.recharge ??= `${game.i18n.localize("DND5E.Recharge")} [${
          recovery.formula}${parseInt(recovery.formula) < 6 ? "+" : ""}]`;
      } else if ( recovery.period in CONFIG.DND5E.limitedUsePeriods ) {
        const config = CONFIG.DND5E.limitedUsePeriods[recovery.period];
        periods.push(config.abbreviation ?? config.label);
      }
    }
    if ( labels ) labels.recovery = game.i18n.getListFormatter({ style: "narrow" }).format(periods);
  }
}
