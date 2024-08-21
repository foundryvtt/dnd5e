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
    this.uses.value = this.uses.max ? Math.clamp(this.uses.max - this.uses.spent, 0, this.uses.max) : 0;

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

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine uses recovery.
   * @this {ItemDataModel|BaseActivityData}
   * @param {string[]} periods  Recovery periods to check.
   * @param {object} rollData   Roll data to use when evaluating recover formulas.
   * @returns {Promise<{ updates: object, rolls: BasicRoll[] }|false>}
   */
  static async recoverUses(periods, rollData) {
    if ( !this.uses.recovery.length ) return false;

    // Search the recovery profiles in order to find the first matching period,
    // and then find the first profile that uses that recovery period
    const matchingPeriod = periods.find(p => this.uses.recovery.find(r => r.period === p));
    const profile = this.uses.recovery.find(r => r.period === matchingPeriod);
    if ( !profile ) return false;

    const updates = {};
    const rolls = [];
    const item = this.item ?? this.parent;

    if ( profile.type === "recoverAll" ) updates.spent = 0;
    else if ( profile.type === "loseAll" ) updates.spent = this.uses.max;
    else if ( profile.formula ) {
      let roll;
      let total;
      try {
        roll = new CONFIG.Dice.BasicRoll(profile.formula, rollData);
        if ( ["day", "dawn", "dusk"].includes(profile.period)
          && (game.settings.get("dnd5e", "restVariant") === "gritty") ) {
          roll.alter(7, 0, { multiplyNumeric: true });
        }
        total = (await roll.evaluate()).total;
      } catch(err) {
        Hooks.onError("UsesField#recoverUses", err, {
          msg: game.i18n.format("DND5E.ItemRecoveryFormulaWarning", {
            name: item.name, formula: profile.formula, uuid: this.uuid ?? item.uuid
          }),
          log: "error",
          notify: "error"
        });
        return false;
      }

      const newSpent = Math.clamp(this.uses.spent - total, 0, this.uses.max);
      if ( newSpent !== this.uses.spent ) {
        updates.spent = newSpent;
        if ( !roll.isDeterministic ) {
          rolls.push(roll);
          const diff = this.uses.spent - newSpent;
          const isMax = newSpent === 0;
          const localizationKey = `DND5E.Item${diff < 0 ? "Loss" : "Recovery"}Roll${isMax ? "Max" : ""}`;
          await roll.toMessage({
            user: game.user.id,
            speaker: { actor: item.actor, alias: item.name },
            flavor: game.i18n.format(localizationKey, { name: item.name, count: Math.abs(diff) })
          });
        }
      }
    }

    return { updates, rolls };
  }
}
