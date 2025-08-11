import simplifyRollFormula from "../../../dice/simplify-roll-formula.mjs";
import { formatNumber, getHumanReadableAttributeLabel, simplifyBonus } from "../../../utils.mjs";
import EmbeddedDataField5e from "../..//fields/embedded-data-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";

const { ArrayField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for holding one or more consumption targets.
 */
export default class ConsumptionTargetsField extends ArrayField {
  constructor(options={}) {
    super(new EmbeddedDataField5e(ConsumptionTargetData), options);
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
      type: new StringField({ required: true, blank: false, initial: "activityUses" }),
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
   * @type {Actor5e}
   */
  get actor() {
    return this.activity.actor;
  }

  /* -------------------------------------------- */

  /**
   * Should this consumption only be performed during initiative? This will return `true` if consuming activity or item
   * uses and those uses only recover on "combat" periods.
   * @type {boolean}
   */
  get combatOnly() {
    let recovery;
    switch ( this.type ) {
      case "activityUses":
        recovery = this.activity.uses.recovery;
        break;
      case "itemUses":
        recovery = (this.target ? this.actor?.items.get(this.target) : this.item)?.system.uses.recovery;
        break;
      default: return false;
    }
    if ( !recovery?.length ) return false;
    return recovery.every(r => CONFIG.DND5E.limitedUsePeriods[r.period]?.type === "combat");
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
      rolls: updates.rolls,
      delta: { item: this.item.id, keyPath: `system.activities.${this.activity.id}.uses.spent` }
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
    const keyPath = `system.${this.target}`;
    const cost = (await this.resolveCost({ config, delta: { keyPath }, rolls: updates.rolls })).total;

    if ( !foundry.utils.hasProperty(this.actor, keyPath) ) throw new ConsumptionError(
      game.i18n.format("DND5E.CONSUMPTION.Warning.MissingAttribute", {
        activity: this.activity.name, attribute: this.target, item: this.item.name
      })
    );
    let current = foundry.utils.getProperty(this.actor, keyPath);

    let warningMessage;
    if ( (cost > 0) && !current ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( current < cost ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) throw new ConsumptionError(game.i18n.format(warningMessage, {
      available: formatNumber(current), cost: formatNumber(cost),
      type: game.i18n.format("DND5E.CONSUMPTION.Type.Attribute.Warning", { attribute: this.target })
    }));

    const adjustedKeyPath = keyPath.replace(/\.value$/, ".spent");
    const isSpent = (keyPath !== adjustedKeyPath) && !foundry.utils.hasProperty(this.actor._source, keyPath)
      && foundry.utils.hasProperty(this.actor._source, adjustedKeyPath);
    if ( isSpent ) {
      current = foundry.utils.getProperty(this.actor, adjustedKeyPath);
      updates.actor[adjustedKeyPath] = current + cost;
    } else updates.actor[keyPath] = current - cost;
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
    const validClasses = Object.values(this.actor.classes).filter(cls => {
      return !denom || (cls.system.hd.denomination === denom);
    });
    const total = validClasses.reduce((count, cls) => count + cls.system.hd.value, 0);

    if ( !denom ) validClasses.sort((lhs, rhs) => {
      const sort = lhs.system.hd.denomination.localeCompare(rhs.system.hd.denomination, "en", { numeric: true });
      return (this.target === "smallest") ? sort : sort * -1;
    });

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
      const available = toConsume > 0 ? cls.system.hd.value : 0;
      const delta = toConsume > 0 ? Math.min(toConsume, available) : Math.max(toConsume, available);
      const itemUpdate = { "system.hd.spent": cls.system.hd.spent + delta };
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
      rolls: updates.rolls,
      delta: { item: item.id, keyPath: "system.uses.spent" }
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
        itemUpdate["system.quantity"] = newQuantity;
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

    const delta = { item: item.id, keyPath: "system.quantity" };
    const cost = (await this.resolveCost({ config, delta, rolls: updates.rolls })).total;

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
    const levelNumber = Math.clamp(
      this.resolveLevel({ config, rolls: updates.rolls }), 1, Object.keys(CONFIG.DND5E.spellLevels).length - 1
    );
    const keyPath = `system.spells.spell${levelNumber}.value`;
    const cost = (await this.resolveCost({ config, delta: { keyPath }, rolls: updates.rolls })).total;

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

    updates.actor[keyPath] = Math.max(0, newValue);
  }

  /* -------------------------------------------- */

  /**
   * Calculate updates to activity or item uses.
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} options
   * @param {UsesData} options.uses            Uses data to consume.
   * @param {string} options.type              Type label to be used in warning messages.
   * @param {BasicRoll[]} options.rolls        Rolls performed as part of the usages.
   * @param {object} [options.delta]           Delta information stored in roll options.
   * @returns {{ spent: number, quantity: number }|null}
   * @internal
   */
  async _usesConsumption(config, { uses, type, rolls, delta }) {
    const cost = (await this.resolveCost({ config, delta, rolls })).total;

    let warningMessage;
    if ( cost > 0 && !uses.value ) warningMessage = "DND5E.CONSUMPTION.Warning.None";
    else if ( cost > uses.value ) warningMessage = "DND5E.CONSUMPTION.Warning.NotEnough";
    if ( warningMessage ) throw new ConsumptionError(
      game.i18n.format(warningMessage, { type, cost: formatNumber(cost), available: formatNumber(uses.value) })
    );

    return { spent: uses.spent + cost };
  }

  /* -------------------------------------------- */
  /*  Consumption Hints                           */
  /* -------------------------------------------- */

  /**
   * Create label and hint text indicating how much of this resource will be consumed/recovered.
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  getConsumptionLabels(config, options={}) {
    const typeConfig = CONFIG.DND5E.activityConsumptionTypes[this.type];
    if ( !typeConfig?.consumptionLabels ) return "";
    return typeConfig.consumptionLabels.call(this, config, options);
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsActivityUses(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey, pluralRule } = this._resolveHintCost(config);
    const uses = this.activity.uses;
    const usesPluralRule = new Intl.PluralRules(game.i18n.lang).select(uses.value);
    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.ActivityUses.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.ActivityUses.PromptHint${increaseKey}`,
        {
          cost,
          use: game.i18n.localize(`DND5E.CONSUMPTION.Type.Use.${pluralRule}`),
          available: formatNumber(uses.value),
          availableUse: game.i18n.localize(`DND5E.CONSUMPTION.Type.Use.${usesPluralRule}`)
        }
      ),
      warn: simplifiedCost > uses.value
    };
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsAttribute(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey } = this._resolveHintCost(config);
    const current = foundry.utils.getProperty(this.actor.system, this.target);
    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.Attribute.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.Attribute.PromptHint${increaseKey}`,
        { cost, attribute: this.target, current: formatNumber(current) }
      ),
      warn: simplifiedCost > current
    };
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsHitDice(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey, pluralRule } = this._resolveHintCost(config);
    let denomination;
    if ( this.target === "smallest" ) denomination = game.i18n.localize("DND5E.ConsumeHitDiceSmallest");
    else if ( this.target === "largest" ) denomination = game.i18n.localize("DND5E.ConsumeHitDiceLargest");
    else denomination = this.target;
    const available = (["smallest", "largest"].includes(this.target)
      ? this.actor.system.attributes?.hd?.value : this.actor.system.attributes?.hd?.bySize?.[this.target]) ?? 0;
    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.HitDice.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.HitDice.PromptHint${increaseKey}`,
        {
          cost, denomination: denomination.toLowerCase(),
          die: game.i18n.localize(`DND5E.CONSUMPTION.Type.HitDie.${pluralRule}`),
          available: formatNumber(available)
        }
      ),
      warn: simplifiedCost > available
    };
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsItemUses(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey, pluralRule } = this._resolveHintCost(config);
    const item = this.actor.items.get(this.target);
    const itemName = item ? item.name : game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem").toLowerCase();
    const uses = (item ?? this.item).system.uses;
    const usesPluralRule = new Intl.PluralRules(game.i18n.lang).select(uses.value);

    const notes = [];
    let warn = false;
    if ( simplifiedCost > uses.value ) warn = true;
    else if ( (simplifiedCost > 0) && (uses.value - simplifiedCost === 0) && uses.autoDestroy ) notes.push({
      type: "warn",
      message: game.i18n.format("DND5E.CONSUMPTION.Warning.WillDestroy", { item: itemName })
    });

    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.ItemUses.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.ItemUses.PromptHint${increaseKey}`,
        {
          cost,
          use: game.i18n.localize(`DND5E.CONSUMPTION.Type.Use.${pluralRule}`),
          available: formatNumber(uses.value),
          availableUse: game.i18n.localize(`DND5E.CONSUMPTION.Type.Use.${usesPluralRule}`),
          item: item ? `<em>${itemName}</em>` : itemName
        }
      ),
      notes: consumed ? notes : null,
      warn
    };
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsMaterial(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey } = this._resolveHintCost(config);
    const item = this.actor.items.get(this.target);
    const quantity = (item ?? this.item).system.quantity;
    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.Material.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.Material.PromptHint${increaseKey}`,
        {
          cost,
          item: item ? `<em>${item.name}</em>` : game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem").toLowerCase(),
          quantity: formatNumber(quantity)
        }
      ),
      warn: simplifiedCost > quantity
    };
  }

  /* -------------------------------------------- */

  /**
   * Create hint text indicating how much of this resource will be consumed/recovered.
   * @this {ConsumptionTargetData}
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @param {object} [options={}]
   * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
   * @returns {ConsumptionLabels}
   */
  static consumptionLabelsSpellSlots(config, { consumed }={}) {
    const { cost, simplifiedCost, increaseKey, pluralRule } = this._resolveHintCost(config);
    const levelNumber = Math.clamp(this.resolveLevel({ config }), 1, Object.keys(CONFIG.DND5E.spellLevels).length - 1);
    const level = CONFIG.DND5E.spellLevels[levelNumber].toLowerCase();
    const available = this.actor.system.spells?.[`spell${levelNumber}`]?.value ?? 0;
    return {
      label: game.i18n.localize(`DND5E.CONSUMPTION.Type.SpellSlots.Prompt${increaseKey}`),
      hint: game.i18n.format(
        `DND5E.CONSUMPTION.Type.SpellSlots.PromptHint${increaseKey}`,
        {
          cost,
          slot: game.i18n.format(`DND5E.CONSUMPTION.Type.SpellSlot.${pluralRule}`, { level }),
          available: formatNumber(available)
        }
      ),
      warn: simplifiedCost > available
    };
  }

  /* -------------------------------------------- */

  /**
   * Resolve the cost for the consumption hint.
   * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
   * @returns {{ cost: string, simplifiedCost: number, increaseKey: string, pluralRule: string }}
   * @internal
   */
  _resolveHintCost(config) {
    const costRoll = this.resolveCost({ config, evaluate: false });
    let cost = costRoll.isDeterministic
      ? String(costRoll.evaluateSync().total)
      : simplifyRollFormula(costRoll.formula);
    const simplifiedCost = simplifyBonus(cost);
    const isNegative = cost.startsWith("-");
    if ( isNegative ) cost = cost.replace("-", "");
    let pluralRule;
    if ( costRoll.isDeterministic ) pluralRule = new Intl.PluralRules(game.i18n.lang).select(Number(cost));
    else pluralRule = "other";
    return { cost, simplifiedCost, increaseKey: isNegative ? "Increase" : "Decrease", pluralRule };
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
      let group;
      if ( attr.startsWith("abilities.") ) group = game.i18n.localize("DND5E.AbilityScorePl");
      else if ( attr.startsWith("currency.") ) group = game.i18n.localize("DND5E.Currency");
      else if ( attr.startsWith("spells.") ) group = game.i18n.localize("DND5E.CONSUMPTION.Type.SpellSlots.Label");
      else if ( attr.startsWith("attributes.movement.") ) group = game.i18n.localize("DND5E.Speed");
      else if ( attr.startsWith("attributes.senses.") ) group = game.i18n.localize("DND5E.Senses");
      else if ( attr.startsWith("resources.") ) group = game.i18n.localize("DND5E.Resources");
      return { group, value: attr, label: getHumanReadableAttributeLabel(attr, { actor: this.actor }) || attr };
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
      if ( uses.max && (uses.recovery?.length === 1) && (uses.recovery[0].type === "recoverAll")
        && (uses.recovery[0].period !== "recharge") ) {
        const per = CONFIG.DND5E.limitedUsePeriods[uses.recovery[0].period]?.abbreviation;
        label = game.i18n.format("DND5E.AbilityUseConsumableLabel", { max: uses.max, per });
      }
      else label = game.i18n.format("DND5E.AbilityUseChargesLabel", { value: uses.value });
      return `${name} (${label})`;
    };
    return [
      { value: "", label: makeLabel(game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem"), this.item) },
      { rule: true },
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
   * @returns {Promise<BasicRoll>|BasicRoll}             Returns Promise if evaluate is `true`.
   */
  resolveCost({ config={}, ...options }={}) {
    return this._resolveScaledRoll(this.value, this.scaling.mode === "amount" ? config.scaling ?? 0 : 0, options);
  }

  /* -------------------------------------------- */

  /**
   * Resolve the spell level to consume, taking scaling into account.
   * @param {object} [options={}]
   * @param {ActivityUseConfiguration} [options.config]  Usage configuration.
   * @param {BasicRoll[]} [options.rolls]                Rolls performed as part of the usages.
   * @returns {number}
   */
  resolveLevel({ config={}, ...options }={}) {
    const roll = this._resolveScaledRoll(
      this.target, this.scaling.mode === "level" ? config.scaling ?? 0 : 0, { ...options, evaluate: false }
    );
    roll.evaluateSync();
    return roll.total;
  }

  /* -------------------------------------------- */

  /**
   * Resolve a scaling consumption value formula.
   * @param {string} formula                   Formula for the initial value.
   * @param {number} scaling                   Amount to scale the formula.
   * @param {object} [options={}]
   * @param {object} [options.delta]           Delta information stored in roll options.
   * @param {boolean} [options.evaluate=true]  Should the slot roll be evaluated?
   * @param {BasicRoll[]} [options.rolls]      Rolls performed as part of the usages.
   * @returns {Promise<BasicRoll>|BasicRoll}
   * @internal
   */
  _resolveScaledRoll(formula, scaling, { delta, evaluate=true, rolls }={}) {
    const rollData = this.activity.getRollData();
    const roll = new CONFIG.Dice.BasicRoll(formula, rollData, { delta });

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

    if ( evaluate ) return roll.evaluate().then(roll => {
      if ( rolls && !roll.isDeterministic ) rolls.push(roll);
      return roll;
    });
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
