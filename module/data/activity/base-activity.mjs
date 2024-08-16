import simplifyRollFormula from "../../dice/simplify-roll-formula.mjs";
import { formatNumber, safePropertyExists, staticID } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import UsesField from "../shared/uses-field.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";

const { ArrayField, BooleanField, DocumentIdField, FilePathField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data for a consumption target.
 *
 * @typedef {object} ConsumptionTargetData
 * @property {string} type             Type of consumption (e.g. activity uses, item uses, hit die, spell slot).
 * @property {string} target           Target of the consumption depending on the selected type (e.g. item's ID, hit
 *                                     die denomination, spell slot level).
 * @property {string} value            Formula that determines amount consumed or recovered.
 * @property {object} scaling
 * @property {string} scaling.mode     Scaling mode (e.g. no scaling, scale target amount, scale spell level).
 * @property {string} scaling.formula  Specific scaling formula if not automatically calculated from target's value.
 */

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
 * @property {object} consumption
 * @property {ConsumptionTargetData[]} consumption.targets  Collection of consumption targets.
 * @property {object} consumption.scaling
 * @property {boolean} consumption.scaling.allowed  Can this non-spell activity be activated at higher levels?
 * @property {string} consumption.scaling.max    Maximum number of scaling levels for this item.
 * @property {object} description
 * @property {string} description.chatFlavor     Extra text displayed in the activation chat message.
 * @property {DurationField} duration            Duration of the effect.
 * @property {EffectApplicationData[]} effects   Linked effects that can be applied.
 * @property {object} range
 * @property {TargetField} target
 * @property {boolean} target.prompt             Should the player be prompted to place the template?
 * @property {UsesField} uses                    Uses available to this activity.
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

  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        blank: false,
        required: true,
        readOnly: true
      }),
      name: new StringField({ initial: undefined }),
      img: new FilePathField({ initial: undefined, categories: ["IMAGE"] }),
      activation: new ActivationField({
        override: new BooleanField()
      }),
      consumption: new SchemaField({
        targets: new ArrayField(
          new SchemaField({
            type: new StringField(),
            target: new StringField(),
            value: new FormulaField({ initial: "1" }),
            scaling: new SchemaField({
              mode: new StringField(),
              formula: new FormulaField()
            })
          })
        ),
        scaling: new SchemaField({
          allowed: new BooleanField(),
          max: new FormulaField({ deterministic: true })
        })
      }),
      description: new SchemaField({
        chatFlavor: new StringField()
      }),
      duration: new DurationField({
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
    if ( this.isSpell ) {
      return this.item.system.availableAbilities?.first()
        ?? this.actor?.system.attributes?.spellcasting ?? null;
    }
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Helper property to translate this activity type into the old `actionType`.
   * @type {string}
   */
  get actionType() {
    return this.metadata.data;
  }

  /* -------------------------------------------- */

  /**
   * Does this activity or its item require concentration?
   * @type {boolean}
   */
  get requiresConcentration() {
    return this.item.requiresConcentration;
  }

  /* -------------------------------------------- */

  /**
   * Does activating this activity consume a spell slot?
   * @type {boolean}
   */
  get requiresSpellSlot() {
    if ( !this.isSpell || !this.actor?.system.spells ) return false;
    // TODO: Check against specific preparation modes here
    return this.item.system.level > 0;
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
   * @param {object} source  Item's candidate source data.
   */
  static createInitialActivity(source) {
    const activityData = this.transformTypeData(source, {
      _id: this.INITIAL_ID,
      type: this.metadata.type,
      activation: this.transformActivationData(source),
      consumption: this.transformConsumptionData(source),
      description: this.transformDescriptionData(source),
      duration: this.transformDurationData(source),
      effects: this.transformEffectsData(source),
      range: this.transformRangeData(source),
      target: this.transformTargetData(source)
    });
    foundry.utils.setProperty(source, `system.activities.${this.INITIAL_ID}`, activityData);
    foundry.utils.setProperty(source, "flags.dnd5e.persistSourceMigration", true);
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's activation object.
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformActivationData(source) {
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
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformConsumptionData(source) {
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
    } else {
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
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformDescriptionData(source) {
    return {
      chatFlavor: source.system.chatFlavor ?? ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's duration object.
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformDurationData(source) {
    if ( source.type === "spell" ) return {};
    return {
      value: source.system.duration?.value ?? null,
      units: source.system.duration?.units ?? "inst",
      special: ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's effects array.
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object[]}     Creation data for new activity.
   */
  static transformEffectsData(source) {
    return source.effects
      .filter(e => !e.transfer && (e.type !== "enchantment") && (e.flags?.dnd5e?.type !== "enchantment"))
      .map(e => ({ _id: e._id }));
  }

  /* -------------------------------------------- */

  /**
   * Fetch data from the item source and transform it into an activity's range object.
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformRangeData(source) {
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
   * @param {object} source  Item's candidate source data to transform.
   * @returns {object}       Creation data for new activity.
   */
  static transformTargetData(source) {
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
   * @returns {object}             Creation data for new activity.
   */
  static transformTypeData(source, activityData) {
    return activityData;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data related to this activity.
   */
  prepareData() {
    this.name = this.name || game.i18n.localize(this.metadata?.title);
    this.img = this.img || this.metadata?.img;
    this.labels ??= {};
  }

  /* -------------------------------------------- */

  /**
   * Perform final preparation after containing item is prepared.
   * @param {object} [rollData]  Deterministic roll data from the activity.
   */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });

    this._setOverride("activation");
    this._setOverride("duration");
    this._setOverride("range");
    this._setOverride("target");

    Object.defineProperty(this, "_inferredSource", {
      value: Object.freeze(this.toObject(false)),
      configurable: false,
      enumerable: false,
      writable: false
    });

    ActivationField.prepareData.call(this, rollData, this.labels);
    DurationField.prepareData.call(this, rollData, this.labels);
    RangeField.prepareData.call(this, rollData, this.labels);
    TargetField.prepareData.call(this, rollData, this.labels);
    UsesField.prepareData.call(this, rollData, this.labels);

    const actor = this.item.actor;
    if ( !actor ) return;
    for ( const target of this.consumption.targets ) {
      if ( !["itemUses", "material"].includes(target.type) || !target.target ) continue;

      // Re-link UUIDs in consumption fields to explicit items on the actor
      if ( target.target.includes(".") ) {
        const item = actor.sourcedItems?.get(target.target);
        if ( item ) target.target = item.id;
      }

      // If targeted item isn't found, display preparation warning
      if ( !actor.items.get(target.target) ) {
        const message = game.i18n.format("DND5E.CONSUMPTION", { activity: this.name, item: this.item.name });
        actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepare the label for a compiled and simplified damage formula.
   * @param {DamageData[]} parts  Damage parts to create labels for.
   * @param {object} rollData     Deterministic roll data from the item.
   */
  prepareDamageLabel(parts, rollData) {
    this.labels.damage = parts.map(part => {
      let formula;
      try {
        formula = part.formula;
        if ( part.base && this.item.system.magicAvailable ) {
          formula = `${formula} + ${this.item.system.magicalBonus ?? 0}`;
        }
        const roll = new Roll(formula, rollData);
        formula = simplifyRollFormula(roll.formula, { preserveFlavor: true });
      } catch(err) {
        console.warn(`Unable to simplify formula for ${this.name} in item ${this.item.name}${
          this.actor ? ` on ${this.actor.name} (${this.actor.id})` : ""
        } (${this.uuid})`, err);
      }

      let label = formula;
      if ( part.types.size ) {
        label = `${formula} ${game.i18n.getListFormatter({ type: "conjunction" }).format(
          Array.from(part.types)
            .map(p => CONFIG.DND5E.damageTypes[p]?.label ?? CONFIG.DND5E.healingTypes[p]?.label)
            .filter(t => t)
        )}`;
      }

      return { formula, damageType: part.types.size === 1 ? part.types.first() : null, label };
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
   * Get the roll parts used to create the damage rolls.
   * @param {Partial<DamageRollProcessConfiguration>} [config={}]
   * @returns {DamageRollProcessConfiguration}
   */
  getDamageConfig(config={}) {
    if ( !this.damage?.parts ) return foundry.utils.mergeObject({ rolls: [] }, config);

    const scaling = config.scaling ?? 0; // TODO: Set properly once scaling is handled during activation
    const rollConfig = foundry.utils.mergeObject({ scaling }, config);
    const rollData = this.getRollData();
    rollConfig.rolls = this.damage.parts
      .map(d => this._processDamagePart(d, rollConfig, rollData))
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
   * @returns {DamageRollConfiguration}
   * @protected
   */
  _processDamagePart(damage, rollConfig, rollData) {
    const scaledFormula = damage.scaledFormula(rollData.scaling);
    const parts = scaledFormula ? [scaledFormula] : [];
    const data = { ...rollData };

    const bonus = foundry.utils.getProperty(this.actor ?? {}, `system.bonuses.${this.actionType}.damage`);
    if ( bonus && (parseInt(bonus) !== 0) ) {
      parts.push("@bonus");
      data.bonus = bonus;
    }

    return {
      data, parts,
      options: {
        types: damage.types,
        properties: Array.from(this.item.system.properties ?? [])
          .filter(p => CONFIG.DND5E.itemProperties[p]?.isPhysical)
      }
    };
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

  /* -------------------------------------------- */

  /**
   * Generate a list of targets for the "Attribute" consumption type.
   * @this {Activity}
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
   * @this {Activity}
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
   * @this {Activity}
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
   * @this {Activity}
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
   * @this {Activity}
   * @returns {FormSelectOption[]}
   */
  static validSpellSlotsTargets() {
    return Object.entries(CONFIG.DND5E.spellLevels).reduce((arr, [value, label]) => {
      if ( value !== "0" ) arr.push({ value, label });
      return arr;
    }, []);
  }
}
