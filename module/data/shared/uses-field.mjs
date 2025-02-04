import { formatNumber, formatRange, prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {object} UsesData
 * @property {number} spent                 Number of uses that have been spent.
 * @property {string} max                   Formula for the maximum number of uses.
 * @property {UsesRecoveryData[]} recovery  Recovery profiles for this activity's uses.
 */

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

    this.uses.label = UsesField.getStatblockLabel.call(this);

    Object.defineProperty(this.uses, "rollRecharge", {
      value: UsesField.rollRecharge.bind(this.parent?.system ? this.parent : this),
      configurable: true
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a label for uses data that matches the style seen on NPC stat blocks. Complex recovery data might result
   * in no label being generated if it doesn't represent recovery that can be normally found on a NPC.
   * @this {ItemDataModel|BaseActivityData}
   * @returns {string}
   */
  static getStatblockLabel() {
    if ( !this.uses.max || (this.uses.recovery.length !== 1) ) return "";
    const recovery = this.uses.recovery[0];

    // Recharge X–Y
    if ( recovery.period === "recharge" ) {
      const value = parseInt(recovery.formula);
      return `${game.i18n.localize("DND5E.Recharge")} ${value === 6 ? "6" : `${value}–6`}`;
    }

    // Recharge after a Short or Long Rest
    if ( ["lr", "sr"].includes(recovery.period) && (this.uses.max === 1) ) {
      return game.i18n.localize(`DND5E.Recharge${recovery.period === "sr" ? "Short" : "Long"}`);
    }

    // X/Day
    const period = CONFIG.DND5E.limitedUsePeriods[recovery.period === "sr" ? "sr" : "day"]?.label ?? "";
    if ( !period ) return "";
    return `${this.uses.max}/${period}`;
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
    if ( !this.uses?.recovery.length ) return false;

    // Search the recovery profiles in order to find the first matching period,
    // and then find the first profile that uses that recovery period
    let profile;
    findPeriod: {
      for ( const period of periods ) {
        for ( const recovery of this.uses.recovery ) {
          if ( recovery.period === period ) {
            profile = recovery;
            break findPeriod;
          }
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
   * @param {BasicRollProcessConfiguration} config   Configuration information for the roll.
   * @param {BasicRollDialogConfiguration} dialog    Configuration for the roll dialog.
   * @param {BasicRollMessageConfiguration} message  Configuration for the roll message.
   * @returns {Promise<BasicRoll[]|void>}            The created Roll instances, or `null` if no die was rolled.
   */
  static async rollRecharge(config={}, dialog={}, message={}) {
    const uses = this.system ? this.system.uses : this.uses;
    const recharge = uses?.recovery.find(({ period }) => period === "recharge");
    if ( !recharge ) return;

    const rollConfig = foundry.utils.mergeObject({
      rolls: [{
        parts: ["1d6"],
        data: this.getRollData(),
        options: {
          target: parseInt(recharge.formula)
        }
      }]
    }, config);
    rollConfig.hookNames = [...(config.hookNames ?? []), "recharge"];
    rollConfig.subject = this;

    const dialogConfig = foundry.utils.mergeObject({ configure: false }, dialog);

    const messageConfig = foundry.utils.mergeObject(({
      create: true,
      data: {
        speaker: ChatMessage.getSpeaker({ actor: this.actor, token: this.actor.token })
      },
      rollMode: game.settings.get("core", "rollMode")
    }));

    if ( "dnd5e.preRollRecharge" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.preRollRecharge` hook has been deprecated and replaced with `dnd5e.preRollRechargeV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      const hookData = {
        formula: rollConfig.rolls[0].parts[0], data: rollConfig.rolls[0].data,
        target: rollConfig.rolls[0].options.target, chatMessage: messageConfig.create
      };
      if ( Hooks.call("dnd5e.preRollRecharge", this, hookData) === false ) return;
      rollConfig.rolls[0].parts[0] = hookData.formula;
      rollConfig.rolls[0].data = hookData.data;
      rollConfig.rolls[0].options.target = hookData.target;
      messageConfig.create = hookData.chatMessage;
    }

    const rolls = await CONFIG.Dice.BasicRoll.buildConfigure(rollConfig, dialogConfig, messageConfig);
    await CONFIG.Dice.BasicRoll.buildEvaluate(rolls, rollConfig, messageConfig);
    if ( !rolls.length ) return;
    messageConfig.data.flavor = game.i18n.format("DND5E.ItemRechargeCheck", {
      name: this.name,
      result: game.i18n.localize(`DND5E.ItemRecharge${rolls[0].isSuccess ? "Success" : "Failure"}`)
    });
    await CONFIG.Dice.BasicRoll.buildPost(rolls, rollConfig, messageConfig);

    const updates = {};
    if ( rolls[0].isSuccess ) {
      if ( this instanceof Item ) updates["system.uses.spent"] = 0;
      else updates["uses.spent"] = 0;
    }

    /**
     * A hook event that fires after an Item or Activity has rolled to recharge, but before any usage changes have
     * been made.
     * @function dnd5e.rollRechargeV2
     * @memberof hookEvents
     * @param {BasicRoll[]} rolls             The resulting rolls.
     * @param {object} data
     * @param {Item5e|Activity} data.subject  Item or Activity for which the roll was performed.
     * @param {object} data.updates           Updates to be applied to the subject.
     * @returns {boolean}                     Explicitly return `false` to prevent updates from being performed.
     */
    if ( Hooks.call("dnd5e.rollRechargeV2", rolls, { subject: this, updates }) === false ) return rolls;

    if ( "dnd5e.rollRecharge" in Hooks.events ) {
      foundry.utils.logCompatibilityWarning(
        "The `dnd5e.rollRecharge` hook has been deprecated and replaced with `dnd5e.rollRechargeV2`.",
        { since: "DnD5e 4.0", until: "DnD5e 4.4" }
      );
      if ( Hooks.call("dnd5e.rollRecharge", this, rolls[0]) === false ) return rolls;
    }

    if ( !foundry.utils.isEmpty(updates) ) await this.update(updates);

    /**
     * A hook event that fires after an Item or Activity has rolled recharge and usage updates have been performed.
     * @function dnd5e.postRollRecharge
     * @memberof hookEvents
     * @param {BasicRoll[]} rolls     The resulting rolls.
     * @param {object} data
     * @param {Actor5e} data.subject  Item or Activity for which the roll was performed.
     */
    Hooks.callAll("dnd5e.postRollRecharge", rolls, { subject: this });

    return rolls;
  }
}
