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
        recovery.formula ??= "6";
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

    Object.defineProperty(this.uses, "rollRecharge", {
      value: UsesField.rollRecharge.bind(this.parent?.system ? this.parent : this),
      configurable: true
    });
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
    let profile;
    for ( const period of periods ) {
      for ( const recovery of this.uses.recovery ) {
        if ( recovery.period === period ) {
          profile = recovery;
          break;
        }
      }
    }
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

  /* -------------------------------------------- */

  /**
   * Rolls a recharge test for an Item or Activity that uses the d6 recharge mechanic.
   * @this {Item5e|Activity}
   * @returns {Promise<Roll|void>}
   */
  static async rollRecharge() {
    const uses = this.system ? this.system.uses : this.uses;
    const recharge = uses?.recovery.find(({ period }) => period === "recharge");
    if ( !recharge ) return;

    const rollConfig = {
      formula: "1d6",
      data: this.getRollData(),
      target: parseInt(recharge.formula),
      chatMessage: true
    };

    /**
     * A hook event that fires before the Item or Activity is rolled to recharge.
     * @function dnd5e.preRollRecharge
     * @memberof hookEvents
     * @param {Item5e|Activity} subject     Item or Activity for which the roll is being performed.
     * @param {object} config               Configuration data for the pending roll.
     * @param {string} config.formula       Formula that will be used to roll the recharge.
     * @param {object} config.data          Data used when evaluating the roll.
     * @param {number} config.target        Total required to be considered recharged.
     * @param {boolean} config.chatMessage  Should a chat message be created for this roll?
     * @returns {boolean}                   Explicitly return false to prevent the roll from being performed.
     */
    if ( Hooks.call("dnd5e.preRollRecharge", this, rollConfig) === false ) return;

    const roll = await new Roll(rollConfig.formula, rollConfig.data).evaluate();
    const success = roll.total >= rollConfig.target;

    if ( rollConfig.chatMessage ) {
      const resultMessage = game.i18n.localize(`DND5E.ItemRecharge${success ? "Success" : "Failure"}`);
      roll.toMessage({
        flavor: `${game.i18n.format("DND5E.ItemRechargeCheck", { name: this.name, result: resultMessage })}`,
        speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.actor.token })
      });
    }

    /**
     * A hook event that fires after the Item or Activity has rolled to recharge, but before any changes have been
     * made.
     * @function dnd5e.rollRecharge
     * @memberof hookEvents
     * @param {Item5e|Activity} subject  Item or Activity for which the roll was performed.
     * @param {Roll} roll                The resulting roll.
     * @returns {boolean}                Explicitly return false to prevent the item from being recharged.
     */
    if ( Hooks.call("dnd5e.rollRecharge", this, roll) === false ) return roll;

    // Recharge the Item or Activity
    if ( success ) {
      if ( this instanceof Item ) await this.update({ "system.uses.spent": 0 });
      else await this.item.updateActivity(this.id, { "uses.spent": 0 });
    }

    return roll;
  }
}
