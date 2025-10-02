import simplifyRollFormula from "../../dice/simplify-roll-formula.mjs";
import { safePropertyExists, staticID } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import UsesField from "../shared/uses-field.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";
import ConsumptionTargetsField from "./fields/consumption-targets-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, FilePathField, IntegerSortField, SchemaField, StringField
} = foundry.data.fields;

/**
 * Data for effects that can be applied.
 *
 * @typedef {object} EffectApplicationData
 * @property {string} _id  ID of the effect to apply.
 */

/**
 * Data model for activities.
 *
 * @property {string} _id                        Unique ID for the activity on an item.
 * @property {string} type                       Type name of the activity used to build a specific activity class.
 * @property {string} name                       Name for this activity.
 * @property {string} img                        Image that represents this activity.
 * @property {ActivationField} activation        Activation time & conditions.
 * @property {boolean} activation.override       Override activation values inferred from item.
 * @property {object} consumption
 * @property {object} consumption.scaling
 * @property {boolean} consumption.scaling.allowed          Can this non-spell activity be activated at higher levels?
 * @property {string} consumption.scaling.max               Maximum number of scaling levels for this item.
 * @property {boolean} consumption.spellSlot                If this is on a spell, should it consume a spell slot?
 * @property {ConsumptionTargetData[]} consumption.targets  Collection of consumption targets.
 * @property {object} description
 * @property {string} description.chatFlavor     Extra text displayed in the activation chat message.
 * @property {DurationField} duration            Duration of the effect.
 * @property {boolean} duration.concentration    Does this effect require concentration?
 * @property {boolean} duration.override         Override duration values inferred from item.
 * @property {EffectApplicationData[]} effects   Linked effects that can be applied.
 * @property {object} range
 * @property {boolean} range.override            Override range values inferred from item.
 * @property {TargetData} target
 * @property {boolean} target.override           Override target values inferred from item.
 * @property {boolean} target.prompt             Should the player be prompted to place the template?
 * @property {UsesData} uses                     Uses available to this activity.
 */
export default class BaseActivityData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "DND5E.ACTIVITY", "DND5E.ACTIVATION", "DND5E.CONSUMPTION",
    "DND5E.DURATION", "DND5E.RANGE", "DND5E.TARGET", "DND5E.USES"
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        blank: false, required: true, readOnly: true, initial: () => this.metadata.type
      }),
      name: new StringField({ initial: undefined }),
      img: new FilePathField({ initial: undefined, categories: ["IMAGE"], base64: false }),
      sort: new IntegerSortField(),
      activation: new ActivationField({
        override: new BooleanField()
      }),
      consumption: new SchemaField({
        scaling: new SchemaField({
          allowed: new BooleanField(),
          max: new FormulaField({ deterministic: true })
        }),
        spellSlot: new BooleanField({ initial: true }),
        targets: new ConsumptionTargetsField()
      }),
      description: new SchemaField({
        chatFlavor: new StringField()
      }),
      duration: new DurationField({
        concentration: new BooleanField(),
        override: new BooleanField()
      }),
      effects: new ArrayField(new AppliedEffectField()),
      range: new RangeField({
        override: new BooleanField()
      }),
      target: new TargetField({
        override: new BooleanField(),
        prompt: new BooleanField({ initial: true })
      }),
      uses: new UsesField()
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The primary ability for this activity that will be available as `@mod` in roll data.
   * @type {string|null}
   */
  get ability() {
    return this.isSpell ? this.spellcastingAbility : null;
  }

  /* -------------------------------------------- */

  /**
   * Helper property to translate this activity type into the old `actionType`.
   * @type {string}
   */
  get actionType() {
    return this.metadata.type;
  }

  /* -------------------------------------------- */

  /**
   * A specific set of activation-specific labels displayed in chat cards.
   * @type {object|null}
   */
  get activationLabels() {
    if ( !this.activation.type || this.isSpell ) return null;
    const { activation, duration, range, reach, target } = this.labels;
    return { activation, duration, range, reach, target };
  }

  /* -------------------------------------------- */

  /**
   * Effects that can be applied from this activity.
   * @type {ActiveEffect5e[]|null}
   */
  get applicableEffects() {
    return this.effects?.map(e => e.effect).filter(e => e) ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Can consumption scaling be configured?
   * @type {boolean}
   */
  get canConfigureScaling() {
    return this.consumption.scaling.allowed || this.item.system.canConfigureScaling;
  }

  /* -------------------------------------------- */

  /**
   * Is scaling possible with this activity?
   * @type {boolean}
   */
  get canScale() {
    return this.consumption.scaling.allowed || this.item.system.canScale;
  }

  /* -------------------------------------------- */

  /**
   * Can this activity's damage be scaled?
   * @type {boolean}
   */
  get canScaleDamage() {
    return this.consumption.scaling.allowed || this.isScaledScroll || this.item.system.canScaleDamage;
  }

  /* -------------------------------------------- */

  /**
   * Is this activity on a spell scroll that is scaled.
   * @type {boolean}
   */
  get isScaledScroll() {
    return !!this.item.getFlag("dnd5e", "spellLevel");
  }

  /* -------------------------------------------- */

  /**
   * Is this activity on a spell?
   * @type {boolean}
   */
  get isSpell() {
    return this.item.type === "spell";
  }

  /* -------------------------------------------- */

  /**
   * Does this activity or its item require concentration?
   * @type {boolean}
   */
  get requiresConcentration() {
    return this.duration.concentration;
  }

  /* -------------------------------------------- */

  /**
   * Does activating this activity consume a spell slot?
   * @type {boolean}
   */
  get requiresSpellSlot() {
    if ( !this.isSpell || !this.actor?.system.spells ) return false;
    return this.canScale;
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the spellcasting ability that can be used with this activity.
   * @type {string|null}
   */
  get spellcastingAbility() {
    let ability;
    if ( this.isSpell ) ability = this.item.system.availableAbilities?.first();
    return ability ?? this.actor?.system.attributes?.spellcasting ?? null;
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Static ID used for the automatically generated activity created during migration.
   * @type {string}
   */
  static INITIAL_ID = staticID("dnd5eactivity");

  /* -------------------------------------------- */

  /**
   * Migrate data from the item to a newly created activity.
   * @param {object} source              Item's candidate source data.
   * @param {object} [options={}]
   * @param {number} [options.offset=0]  Adjust the default ID using this number when creating multiple activities.
   */
  static createInitialActivity(source, { offset=0, ...options }={}) {
    const activityData = this.transformTypeData(source, {
      _id: this.INITIAL_ID.replace("0", offset),
      type: this.metadata.type,
      activation: this.transformActivationData(source, options),
      consumption: this.transformConsumptionData(source, options),
      description: this.transformDescriptionData(source, options),
      duration: this.transformDurationData(source, options),
      effects: this.transformEffectsData(source, options),
      range: this.transformRangeData(source, options),
      target: this.transformTargetData(source, options),
      uses: this.transformUsesData(source, options)
    }, options);
    foundry.utils.setProperty(source, `system.activities.${activityData._id}`, activityData);
    foundry.utils.setProperty(source, "flags.dnd5e.persistSourceMigration", true);
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's activation object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformActivationData(source, options) {
    if ( source.type === "spell" ) return {};
    return {
      type: source.system.activation?.type === "none" ? "" : (source.system.activation?.type ?? ""),
      value: source.system.activation?.cost ?? null,
      condition: source.system.activation?.condition ?? ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's consumption object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformConsumptionData(source, options) {
    const targets = [];

    const type = {
      attribute: "attribute",
      hitDice: "hitDice",
      material: "material",
      charges: "itemUses"
    }[source.system.consume?.type];

    if ( type ) targets.push({
      type,
      target: source.system.consume?.target ?? "",
      value: source.system.consume?.amount ?? "1",
      scaling: {
        mode: source.system.consume?.scale ? "amount" : "",
        formula: ""
      }
    });

    // If no target type set but this item has max uses, set consumption type to itemUses with blank target
    else if ( source.system.uses?.max ) targets.push({
      type: "itemUses",
      target: "",
      value: "1",
      scaling: {
        mode: source.system.consume?.scale ? "amount" : "",
        formula: ""
      }
    });

    if ( source.system.recharge?.value && source.system.uses?.per ) targets.push({
      type: source.system.uses?.max ? "activityUses" : "itemUses",
      target: "",
      value: "1",
      scaling: { mode: "", formula: "" }
    });

    return {
      targets,
      scaling: {
        allowed: source.system.consume?.scale ?? false,
        max: ""
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Transform an old damage part into the new damage part format.
   * @param {object} source  Item's candidate source data to transform.
   * @param {string[]} part  The damage part to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformDamagePartData(source, [formula, type]) {
    const data = {
      number: null,
      denomination: null,
      bonus: "",
      types: type ? [type] : [],
      custom: {
        enabled: false,
        formula: ""
      },
      scaling: {
        mode: source?.system.scaling?.mode !== "none" ? "whole" : "",
        number: null,
        formula: source?.system.scaling?.formula ?? ""
      }
    };

    const parsed = (formula ?? "").match(/^\s*(\d+)d(\d+)(?:\s*([+|-])\s*(@?[\w\d.-]+))?\s*$/i);
    if ( parsed && CONFIG.DND5E.dieSteps.includes(Number(parsed[2])) ) {
      data.number = Number(parsed[1]);
      data.denomination = Number(parsed[2]);
      if ( parsed[4] ) data.bonus = parsed[3] === "-" ? `-${parsed[4]}` : parsed[4];
    } else if ( formula ) {
      data.custom.enabled = true;
      data.custom.formula = formula;
    }

    // If scaling denomination matches the damage denomination, set scaling using number rather than formula
    const scaling = data.scaling.formula.match(/^\s*(\d+)d(\d+)\s*$/i);
    if ( (scaling && (Number(scaling[2]) === data.denomination)) || (source.system.scaling?.mode === "cantrip") ) {
      data.scaling.number = Number(scaling?.[1] || 1);
      data.scaling.formula = "";
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's description object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformDescriptionData(source, options) {
    return {
      chatFlavor: source.system.chatFlavor ?? ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's duration object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformDurationData(source, options) {
    if ( source.type === "spell" ) return {};
    const concentration = !!source.system.properties?.findSplice(p => p === "concentration");
    return {
      concentration,
      value: source.system.duration?.value ?? null,
      units: source.system.duration?.units ?? "inst",
      special: ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's effects array.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object[]}      Creation data for new activity.
   */
  static transformEffectsData(source, options) {
    return source.effects
      .filter(e => !e.transfer && (e.type !== "enchantment") && (e.flags?.dnd5e?.type !== "enchantment"))
      .map(e => ({ _id: e._id }));
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's range object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformRangeData(source, options) {
    if ( source.type === "spell" ) return {};
    return {
      value: source.system.range?.value ?? null,
      units: source.system.range?.units ?? "",
      special: ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's target object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformTargetData(source, options) {
    if ( source.type === "spell" ) return {
      prompt: source.system.target?.prompt ?? true
    };

    const data = {
      template: {
        count: "",
        contiguous: false,
        type: "",
        size: "",
        width: "",
        height: "",
        units: source.system.target?.units ?? "ft"
      },
      affects: {
        count: "",
        type: "",
        choice: false,
        special: ""
      },
      prompt: source.system.target?.prompt ?? true
    };

    if ( source.system.target?.type in CONFIG.DND5E.areaTargetTypes ) foundry.utils.mergeObject(data, {
      template: {
        type: source.system.target?.type ?? "",
        size: source.system.target?.value ?? "",
        width: source.system.target?.width ?? ""
      }
    });

    else foundry.utils.mergeObject(data, {
      affects: {
        count: source.system.target?.value ?? "",
        type: source.system.target?.type ?? ""
      }
    });

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Perform any type-specific data transformations.
   * @param {object} source        Item's candidate source data to transform.
   * @param {object} activityData  In progress creation data.
   * @param {object} options       Additional options passed to the creation process.
   * @returns {object}             Creation data for new activity.
   */
  static transformTypeData(source, activityData, options) {
    return activityData;
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's uses object.
   * @param {object} source   Item's candidate source data to transform.
   * @param {object} options  Additional options passed to the creation process.
   * @returns {object}        Creation data for new activity.
   */
  static transformUsesData(source, options) {
    // Do not add a recharge recovery to the activity if the parent item would already get recharge recovery.
    if ( !source.system.recharge?.value || !source.system.uses?.max || !source.system.uses?.per ) {
      return { spent: 0, max: "", recovery: [] };
    }
    return {
      spent: source.system.recharge.charged ? 0 : 1,
      max: "1",
      recovery: [{
        period: "recharge",
        type: "recoverAll",
        formula: String(source.system.recharge.value)
      }]
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare context to display this activity in a parent sheet.
   * @returns {object}
   */
  prepareSheetContext() {
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Prepare data related to this activity.
   */
  prepareData() {
    this.name = this.name || game.i18n.localize(this.metadata?.title);
    this.img = this.img || this.metadata?.img;
    this.labels ??= {};
    const addBaseIndices = data => data?.forEach((d, idx) => Object.defineProperty(d, "_index", { value: idx }));
    addBaseIndices(this.consumption?.targets);
    addBaseIndices(this.damage?.parts);
    addBaseIndices(this.effects);
    addBaseIndices(this.uses?.recovery);
  }

  /* -------------------------------------------- */

  /**
   * Perform final preparation after containing item is prepared.
   * @param {object} [rollData]  Deterministic roll data from the activity.
   */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });

    if ( this.activation ) this._setOverride("activation");
    if ( this.duration ) this._setOverride("duration");
    if ( this.range ) this._setOverride("range");
    if ( this.target ) this._setOverride("target");

    Object.defineProperty(this, "_inferredSource", {
      value: Object.freeze(this.toObject(false)),
      configurable: false,
      enumerable: false,
      writable: false
    });

    // TODO: Temporarily add parent to consumption targets & damage parts added by enchantment
    // Can be removed once https://github.com/foundryvtt/foundryvtt/issues/12528 is implemented
    if ( this.consumption?.targets ) this.consumption.targets = this.consumption.targets.map(c => {
      if ( c.parent ) return c;
      return c.clone({}, { parent: this });
    });
    if ( this.damage?.parts ) this.damage.parts = this.damage.parts.map(c => {
      if ( c.parent ) return c;
      return c.clone({}, { parent: this });
    });

    if ( this.activation ) ActivationField.prepareData.call(this, rollData, this.labels);
    if ( this.duration ) DurationField.prepareData.call(this, rollData, this.labels);
    if ( this.range ) RangeField.prepareData.call(this, rollData, this.labels);
    if ( this.target ) TargetField.prepareData.call(this, rollData, this.labels);
    if ( this.uses ) UsesField.prepareData.call(this, rollData, this.labels);

    const actor = this.item.actor;
    if ( !actor || !("consumption" in this) ) return;
    for ( const target of this.consumption.targets ) {
      if ( !["itemUses", "material"].includes(target.type) || !target.target ) continue;

      // Re-link UUID or identifier target to explicit item on the actor
      target.target = this._remapConsumptionTarget(target.target);

      // If targeted item isn't found, display preparation warning
      if ( !actor.items.has(target.target) ) {
        const message = game.i18n.format("DND5E.CONSUMPTION.Warning.MissingItem", {
          activity: this.name, item: this.item.name
        });
        actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare the label for a compiled and simplified damage formula.
   * @param {object} rollData  Deterministic roll data from the item.
   * @param {object} _rollData
   */
  prepareDamageLabel(rollData, _rollData=rollData) {
    if ( foundry.utils.getType(rollData) === "Array" ) {
      foundry.utils.logCompatibilityWarning(
        "The `BaseActivityData#prepareDamageLabel` no longer takes damage parts as an input.",
        { since: "DnD5e 4.4", until: "DnD5e 5.1" }
      );
      rollData = _rollData;
    }

    const config = this.getDamageConfig({}, { rollData });
    this.labels.damage = this.labels.damages = (config.rolls ?? []).map(part => {
      let formula;
      try {
        formula = part.parts.join(" + ");
        const roll = new CONFIG.Dice.DamageRoll(formula, part.data);
        roll.simplify();
        formula = simplifyRollFormula(roll.formula, { preserveFlavor: true });
      } catch(err) {
        console.warn(`Unable to simplify formula for ${this.name} in item ${this.item.name}${
          this.actor ? ` on ${this.actor.name} (${this.actor.id})` : ""
        } (${this.uuid})`, err);
      }

      let label = formula;
      const types = part.options?.types ?? (part.options?.type ? [part.options.type] : []);
      if ( types.length ) {
        label = `${formula} ${game.i18n.getListFormatter({ type: "conjunction" }).format(
          types.map(p => CONFIG.DND5E.damageTypes[p]?.label ?? CONFIG.DND5E.healingTypes[p]?.label).filter(_ => _)
        )}`;
      }

      return {
        formula, label,
        base: part.base,
        damageType: part.options?.types.length === 1 ? part.options.types[0] : null
      };
    });
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before an Activity is created.
   * @param {object} data     The initial data object provided to the document creation request.
   * @returns {boolean|void}  A return value of false indicates the creation operation should be cancelled.
   * @protected
   */
  _preCreate(data) {}

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve the action type reflecting changes based on the provided attack mode.
   * @param {string} [attackMode=""]
   * @returns {string}
   */
  getActionType(attackMode="") {
    let actionType = this.actionType;
    if ( (actionType === "mwak") && (attackMode?.startsWith("thrown") || (attackMode === "ranged")) ) return "rwak";
    return actionType;
  }

  /* -------------------------------------------- */

  /**
   * Get the roll parts used to create the damage rolls.
   * @param {Partial<DamageRollProcessConfiguration>} [config={}]  Existing damage configuration to merge into this one.
   * @param {object} [options]                                     Damage configuration options.
   * @param {object} [options.rollData]                            Use pre-existing roll data.
   * @returns {DamageRollProcessConfiguration}
   */
  getDamageConfig(config={}, { rollData }={}) {
    if ( !this.damage?.parts ) return foundry.utils.mergeObject({ rolls: [] }, config);

    const rollConfig = foundry.utils.deepClone(config);
    rollData ??= this.getRollData();
    rollConfig.rolls = this.damage.parts
      .map((d, index) => this._processDamagePart(d, rollConfig, rollData, index))
      .filter(d => d.parts.length)
      .concat(config.rolls ?? []);

    return rollConfig;
  }

  /* -------------------------------------------- */

  /**
   * Process a single damage part into a roll configuration.
   * @param {DamageData} damage                                   Damage to prepare for the roll.
   * @param {Partial<DamageRollProcessConfiguration>} rollConfig  Roll configuration being built.
   * @param {object} rollData                                     Roll data to populate with damage data.
   * @param {number} [index=0]                                    Index of the damage part.
   * @returns {DamageRollConfiguration}
   * @protected
   */
  _processDamagePart(damage, rollConfig, rollData, index=0) {
    const scaledFormula = damage.scaledFormula(rollConfig.scaling ?? rollData.scaling);
    const parts = scaledFormula ? [scaledFormula] : [];
    const data = { ...rollData };

    if ( index === 0 ) {
      const actionType = this.getActionType(rollConfig.attackMode);
      const bonus = foundry.utils.getProperty(this.actor ?? {}, `system.bonuses.${actionType}.damage`);
      if ( bonus && !/^0+$/.test(bonus) ) parts.push(bonus);
      if ( this.item.system.damageBonus ) parts.push(String(this.item.system.damageBonus));
    }

    const lastType = this.item.getFlag("dnd5e", `last.${this.id}.damageType.${index}`);

    return {
      data, parts,
      options: {
        type: (damage.types.has(lastType) ? lastType : null) ?? damage.types.first(),
        types: Array.from(damage.types),
        properties: Array.from(this.item.system.properties ?? [])
          .filter(p => CONFIG.DND5E.itemProperties[p]?.isPhysical)
      }
    };
  }

  /* -------------------------------------------- */

  /**
   * Remap a UUID or identifier in a consumption target to the ID of an item on the actor.
   * @param {string} target
   * @returns {string}
   * @internal
   */
  _remapConsumptionTarget(target) {
    if ( !target || !this.actor || this.actor.items.has(target) ) return target;

    // Re-link UUID target
    const { type } = foundry.utils.parseUuid(target) ?? {};
    if ( type === "Item" ) {
      const item = this.actor.sourcedItems?.get(target)?.first();
      if ( item ) return item.id;
    }

    // Re-link identifier target
    else {
      let identifier = target;
      let type;
      if ( identifier.includes(":") ) [type, identifier] = target.split(":");
      const item = this.actor.identifiedItems?.get(identifier, { type })?.first();
      if ( item ) return item.id;
    }

    return target;
  }

  /* -------------------------------------------- */

  /**
   * Add an `canOverride` property to the provided object and, if `override` is `false`, replace the data on the
   * activity with data from the item.
   * @param {string} keyPath  Path of the property to set on the activity.
   * @internal
   */
  _setOverride(keyPath) {
    const obj = foundry.utils.getProperty(this, keyPath);
    Object.defineProperty(obj, "canOverride", {
      value: safePropertyExists(this.item.system, keyPath),
      configurable: true,
      enumerable: false
    });
    if ( obj.canOverride && !obj.override ) {
      foundry.utils.mergeObject(obj, foundry.utils.getProperty(this.item.system, keyPath));
    }
  }
}
