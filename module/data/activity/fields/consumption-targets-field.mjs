import { formatNumber } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";

const { ArrayField, EmbeddedDataField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for holding one or more consumption targets.
 */
export default class ConsumptionTargetsField extends ArrayField {
  constructor(options={}) {
    super(new EmbeddedDataField(ConsumptionTargetData), options);
  }
}

/**
 * Embedded data model for storing consumption target data and handling consumption.
 *
 * @property {string} type             Type of consumption (e.g. activity uses, item uses, hit die, spell slot).
 * @property {string} target           Target of the consumption depending on the selected type (e.g. item's ID, hit
 *                                     die denomination, spell slot level).
 * @property {string} value            Formula that determines amount consumed or recovered.
 * @property {object} scaling
 * @property {string} scaling.mode     Scaling mode (e.g. no scaling, scale target amount, scale spell level).
 * @property {string} scaling.formula  Specific scaling formula if not automatically calculated from target's value.
 */
export class ConsumptionTargetData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      type: new StringField(),
      target: new StringField(),
      value: new FormulaField({ initial: "1" }),
      scaling: new SchemaField({
        mode: new StringField(),
        formula: new FormulaField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Activity to which this consumption target belongs.
   * @type {Activity}
   */
  get activity() {
    return this.parent;
  }

  /* -------------------------------------------- */

  /**
   * Actor containing this consumption target, if embedded.
   * @type {Activity}
   */
  get actor() {
    return this.activity.actor;
  }

  /* -------------------------------------------- */

  /**
   * Item to which this consumption target's activity belongs.
   * @type {Item5e}
   */
  get item() {
    return this.activity.item;
  }

  /* -------------------------------------------- */

  /**
   * List of valid targets within the current context.
   * @type {FormSelectOption[]|null}
   */
  get validTargets() {
    const config = CONFIG.DND5E.activityConsumptionTypes[this.type];
    if ( !config?.validTargets || (!this.item.isEmbedded && (config.targetRequiresEmbedded === true)) ) return null;
    return config.validTargets.call(this);
  }

  /* -------------------------------------------- */
  /*  Consumption                                 */
  /* -------------------------------------------- */

  /**
   * Perform consumption according to the target type.
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  async consume(config, updates) {
    const typeConfig = CONFIG.DND5E.activityConsumptionTypes[this.type];
    if ( !typeConfig?.consume ) throw new Error("Consumption types must define consumption method.");
    await typeConfig.consume.call(this, config, updates);
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Activity Uses" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeActivityUses(config, updates) {
    const result = await this._usesConsumption(config, {
      uses: this.activity.uses,
      type: game.i18n.format("DND5E.CONSUMPTION.Type.ActivityUses.Warning", {
        activity: this.activity.name, item: this.item.name
      }),
      rolls: updates.rolls
    });
    if ( result ) foundry.utils.mergeObject(updates.activity, { "uses.spent": result.spent });
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Attribute" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeAttribute(config, updates) {
    const cost = (await this.resolveCost({ config, rolls: updates.rolls })).total;
    const keyPath = `system.${this.target}`;

    if ( !foundry.utils.hasProperty(this.actor, keyPath) ) throw new ConsumptionError(
      game.i18n.format("DND5E.CONSUMPTION.Warning.MissingAttribute", {
        activity: this.activity.name, attribute: this.target, item: this.item.name
      })
    );
    const current = foundry.utils.getProperty(this.actor, keyPath);

    let warningMessage;
    if ( (cost > 0) && !current ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( current < cost ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) throw new ConsumptionError(game.i18n.format(warningMessage, {
      available: formatNumber(current), cost: formatNumber(cost),
      type: game.i18n.format("DND5E.CONSUMPTION.Type.Attribute.Warning", { attribute: this.target })
    }));

    updates.actor[keyPath] = current - cost;
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Hit Dice" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeHitDice(config, updates) {
    const cost = (await this.resolveCost({ config, rolls: updates.rolls })).total;

    const denom = !["smallest", "largest"].includes(this.target) ? this.target : false;
    const validClasses = Object.values(this.actor.classes).filter(cls => !denom || (cls.system.hitDice === denom));
    const total = validClasses.reduce((count, cls) => count + cls.system.levels - cls.system.hitDiceUsed, 0);

    if ( this.target === "smallest" ) {
      validClasses.sort((lhs, rhs) => lhs.system.hitDice.localeCompare(rhs.system.hitDice, "en", { numeric: true }));
    } else if ( this.target === "largest" ) {
      validClasses.sort((lhs, rhs) => rhs.system.hitDice.localeCompare(lhs.system.hitDice, "en", { numeric: true }));
    }

    let warningMessage;
    if ( !validClasses.length ) warningMessage = "DND5E.CONSUMPTION.Warning.MissingHitDice";
    else if ( (cost > 0) && !total ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( total < cost ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) {
      const denomination = !["smallest", "largest"].includes(this.target) ? this.target : "";
      throw new ConsumptionError(game.i18n.format(warningMessage, {
        available: formatNumber(total), cost: formatNumber(cost), denomination,
        type: game.i18n.format("DND5E.CONSUMPTION.Type.HitDice.Warning", { denomination })
      }));
    }

    let toConsume = cost;
    for ( const cls of validClasses ) {
      const available = (toConsume > 0 ? cls.system.levels : 0) - cls.system.hitDiceUsed;
      const delta = toConsume > 0 ? Math.min(toConsume, available) : Math.max(toConsume, available);
      const itemUpdate = { "system.hitDiceUsed": cls.system.hitDiceUsed + delta };
      if ( delta !== 0 ) {
        const itemIndex = updates.item.findIndex(i => i._id === cls.id);
        if ( itemIndex === -1 ) updates.item.push({ _id: cls.id, ...itemUpdate });
        else foundry.utils.mergeObject(updates.item[itemIndex], itemUpdate);
        toConsume -= delta;
        if ( toConsume === 0 ) break;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Item Uses" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeItemUses(config, updates) {
    const item = this.target ? this.actor.items.get(this.target) : this.item;
    if ( !item ) throw new ConsumptionError(game.i18n.format("DND5E.CONSUMPTION.Warning.MissingItem", {
      activity: this.activity.name, item: this.item.name
    }));

    const result = await this._usesConsumption(config, {
      uses: item.system.uses,
      type: game.i18n.format("DND5E.CONSUMPTION.Type.ItemUses.Warning", { name: this.item.name }),
      rolls: updates.rolls
    });
    if ( !result ) return;

    const itemUpdate = {};
    if ( item.system.uses.autoDestroy && (result.spent === item.system.uses.max) ) {
      const newQuantity = item.system.quantity - 1;
      if ( newQuantity === 0 ) {
        updates.delete.push(item.id);
        return;
      } else {
        itemUpdate["system.uses.spent"] = 0;
        itemUpdate["system.uses.quantity"] = newQuantity;
      }
    } else {
      itemUpdate["system.uses.spent"] = result.spent;
    }

    const itemIndex = updates.item.findIndex(i => i._id === item.id);
    if ( itemIndex === -1 ) updates.item.push({ _id: item.id, ...itemUpdate });
    else foundry.utils.mergeObject(updates.item[itemIndex], itemUpdate);
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Material" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeMaterial(config, updates) {
    const item = this.target ? this.actor.items.get(this.target) : this.item;
    if ( !item ) throw new ConsumptionError(game.i18n.format("DND5E.CONSUMPTION.Warning.MissingItem", {
      activity: this.activity.name, item: this.item.name
    }));

    const cost = (await this.resolveCost({ config, rolls: updates.rolls })).total;

    let warningMessage;
    if ( cost > 0 && !item.system.quantity ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( cost > item.system.quantity ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) throw new ConsumptionError(game.i18n.format(warningMessage, {
      available: formatNumber(item.system.quantity), cost: formatNumber(cost),
      type: game.i18n.format("DND5E.CONSUMPTION.Type.Material.Warning", { name: item.name })
    }));

    const newQuantity = item.system.quantity - cost;
    if ( (newQuantity === 0) && item.system.uses?.autoDestroy ) {
      updates.delete.push(item.id);
    } else {
      const itemUpdate = { "system.quantity": newQuantity };
      const itemIndex = updates.item.findIndex(i => i._id === item.id);
      if ( itemIndex === -1 ) updates.item.push({ _id: item.id, ...itemUpdate });
      else foundry.utils.mergeObject(updates.item[itemIndex], itemUpdate);
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare consumption updates for "Spell Slots" consumption type.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {ActivityUsageUpdates} updates     Updates to be performed.
   * @throws ConsumptionError
   */
  static async consumeSpellSlots(config, updates) {
    const cost = (await this.resolveCost({ config, rolls: updates.rolls })).total;
    const levelNumber = (await this.resolveLevel({ config, rolls: updates.rolls })).total;

    // Check to see if enough slots are available at the specified level
    const levelData = this.actor.system.spells?.[`spell${levelNumber}`];
    const newValue = (levelData?.value ?? 0) - cost;
    let warningMessage;
    if ( !levelData?.max ) warningMessage = "DND5E.CONSUMPTION.Warning.MissingSpellSlot";
    else if ( (cost > 0) && !levelData.value ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( newValue < 0 ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) {
      const level = CONFIG.DND5E.spellLevels[levelNumber];
      const type = game.i18n.format("DND5E.CONSUMPTION.Type.SpellSlots.Warning", { level });
      throw new ConsumptionError(game.i18n.format(warningMessage, {
        type, level, cost: formatNumber(cost), available: formatNumber(levelData.value)
      }));
    }

    updates.actor[`system.spells.spell${levelNumber}.value`] = Math.max(0, newValue);
  }

  /* -------------------------------------------- */

  /**
   * Calculate updates to activity or item uses.
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} options
   * @param {UsesField} options.uses           Uses data to consume.
   * @param {string} options.type              Type label to be used in warning messages.
   * @param {BasicRoll[]} options.rolls        Rolls performed as part of the usages.
   * @returns {{ spent: number, quantity: number }|null}
   */
  async _usesConsumption(config, { uses, type, rolls }) {
    const cost = (await this.resolveCost({ config, rolls })).total;

    let warningMessage;
    if ( cost > 0 && !uses.value ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( cost > uses.value ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) throw new ConsumptionError(
      game.i18n.format(warningMessage, { type, cost: formatNumber(cost), available: formatNumber(uses.value) })
    );

    return { spent: uses.spent + cost };
  }

  /* -------------------------------------------- */
  /*  Valid Targets                               */
  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Attribute" consumption type.
   * @this {ConsumptionTargetData}
   * @returns {FormSelectOption[]}
   */
  static validAttributeTargets() {
    if ( !this.actor ) return [];
    return TokenDocument.implementation.getConsumedAttributes(this.actor.type).map(attr => {
      return { value: attr, label: attr };
    });
  }

  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Hit Dice" consumption type.
   * @this {ConsumptionTargetData}
   * @returns {FormSelectOption[]}
   */
  static validHitDiceTargets() {
    return [
      { value: "smallest", label: game.i18n.localize("DND5E.ConsumeHitDiceSmallest") },
      ...CONFIG.DND5E.hitDieTypes.map(d => ({ value: d, label: d })),
      { value: "largest", label: game.i18n.localize("DND5E.ConsumeHitDiceLargest") }
    ];
  }

  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Item Uses" consumption type.
   * @this {ConsumptionTargetData}
   * @returns {FormSelectOption[]}
   */
  static validItemUsesTargets() {
    const makeLabel = (name, item) => {
      let label;
      const uses = item.system.uses;
      if ( uses.max && (uses.recovery?.length === 1) && (uses.recovery[0].type === "recoverAll") ) {
        const per = CONFIG.DND5E.limitedUsePeriods[uses.recovery[0].period]?.abbreviation;
        label = game.i18n.format("DND5E.AbilityUseConsumableLabel", { max: uses.max, per });
      }
      else label = game.i18n.format("DND5E.AbilityUseChargesLabel", { value: uses.value });
      return `${name} (${label})`;
    };
    return [
      { value: "", label: makeLabel(game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem"), this.item) },
      ...(this.actor?.items ?? [])
        .filter(i => i.system.uses?.max && (i !== this.item))
        .map(i => ({ value: i.id, label: makeLabel(i.name, i) }))
    ];
  }

  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Material" consumption type.
   * @this {ConsumptionTargetData}
   * @returns {FormSelectOption[]}
   */
  static validMaterialTargets() {
    return (this.actor?.items ?? [])
      .filter(i => ["consumable", "loot"].includes(i.type) && !i.system.activities?.size)
      .map(i => ({ value: i.id, label: `${i.name} (${formatNumber(i.system.quantity)})` }));
  }

  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Spell Slots" consumption type.
   * @this {ConsumptionTargetData}
   * @returns {FormSelectOption[]}
   */
  static validSpellSlotsTargets() {
    return Object.entries(CONFIG.DND5E.spellLevels).reduce((arr, [value, label]) => {
      if ( value !== "0" ) arr.push({ value, label });
      return arr;
    }, []);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Resolve the amount to consume, taking scaling into account.
   * @param {object} [options={}]
   * @param {ActivityUseConfiguration} [options.config]  Usage configuration.
   * @param {boolean} [options.evaluate=true]            Should the cost roll be evaluated?
   * @param {BasicRoll[]} [options.rolls]                Rolls performed as part of the usages.
   * @returns {Promise<BasicRoll>}
   */
  async resolveCost({ config={}, ...options }={}) {
    return this._resolveScaledRoll(this.value, this.scaling.mode === "amount" ? config.scaling ?? 0 : 0, options);
  }

  /* -------------------------------------------- */

  /**
   * Resolve the spell level to consume, taking scaling into account.
   * @param {object} [options={}]
   * @param {ActivityUseConfiguration} [options.config]  Usage configuration.
   * @param {boolean} [options.evaluate=true]            Should the slot roll be evaluated?
   * @param {BasicRoll[]} [options.rolls]                Rolls performed as part of the usages.
   * @returns {Promise<BasicRoll>}
   */
  async resolveLevel({ config={}, ...options }={}) {
    return this._resolveScaledRoll(this.value, this.scaling.mode === "level" ? config.scaling ?? 0 : 0, options);
  }

  /* -------------------------------------------- */

  /**
   * Resolve a scaling consumption value formula.
   * @param {string} formula                   Formula for the initial value.
   * @param {number} scaling                   Amount to scale the formula.
   * @param {object} [options={}]
   * @param {boolean} [options.evaluate=true]  Should the slot roll be evaluated?
   * @param {BasicRoll[]} [options.rolls]      Rolls performed as part of the usages.
   * @returns {Promise<BasicRoll>}
   * @internal
   */
  async _resolveScaledRoll(formula, scaling, { evaluate=true, rolls }={}) {
    const rollData = this.activity.getRollData();
    const roll = new CONFIG.Dice.BasicRoll(formula, rollData);

    if ( scaling ) {
      // If a scaling formula is provided, multiply it and add to the end of the initial formula
      if ( this.scaling.formula ) {
        const scalingRoll = new Roll(this.scaling.formula, rollData);
        scalingRoll.alter(scaling, undefined, { multiplyNumeric: true });
        roll.terms.push(new foundry.dice.terms.OperatorTerm({ operator: "+" }), ...scalingRoll.terms);
      }

      // Otherwise increase the number of dice and the numeric term for each scaling step
      else roll.terms = roll.terms.map(term => {
        if ( term instanceof foundry.dice.terms.DiceTerm ) return term.alter(undefined, scaling);
        else if ( term instanceof foundry.dice.terms.NumericTerm ) term.number += scaling;
        return term;
      });

      roll.resetFormula();
    }

    if ( evaluate ) await roll.evaluate();
    if ( rolls && !roll.isDeterministic ) rolls.push(roll);
    return roll;
  }
}

/**
 * Error to throw when consumption cannot be achieved.
 */
export class ConsumptionError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "ConsumptionError";
  }
}
