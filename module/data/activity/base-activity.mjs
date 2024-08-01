import { formatNumber } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import UsesField from "../shared/uses-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, FilePathField, NumberField, SchemaField, StringField
} = foundry.data.fields;

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
 * @property {string} effect  ID of the effect to apply.
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
 * Data model for activities.
 *
 * @property {string} _id                        Unique ID for the activity on an item.
 * @property {string} type                       Type name of the activity used to build a specific activity class.
 * @property {string} name                       Name for this activity.
 * @property {string} img                        Image that represents this activity.
 * @property {object} activation
 * @property {string} activation.type            Activation type (e.g. action, legendary action, minutes).
 * @property {number} activation.value           Scalar value associated with the activation.
 * @property {string} activation.condition       Condition required to activate this activity.
 * @property {object} consumption
 * @property {ConsumptionTargetData[]} consumption.targets  Collection of consumption targets.
 * @property {object} consumption.scaling
 * @property {boolean} consumption.scaling.allowed  Can this non-spell activity be activated at higher levels?
 * @property {string} consumption.scaling.max    Maximum number of scaling levels for this item.
 * @property {object} duration
 * @property {string} duration.value             Scalar value for the activity's duration.
 * @property {string} duration.units             Units that are used for the duration.
 * @property {string} duration.special           Description of any special duration details.
 * @property {EffectApplicationData[]} effects   Linked effects that can be applied.
 * @property {object} range
 * @property {string} range.value                Scalar value for the activity's range.
 * @property {string} range.units                Units that are used for the range.
 * @property {string} range.special              Description of any special range details.
 * @property {object} target
 * @property {object} target.template
 * @property {string} target.template.count      Number of templates created.
 * @property {boolean} target.template.contiguous  Must all created areas be connected to one another?
 * @property {string} target.template.type       Type of area of effect caused by this activity.
 * @property {string} target.template.size       Size of the activity's area of effect on its primary axis.
 * @property {string} target.template.width      Width of line area of effect.
 * @property {string} target.template.height     Height of cylinder area of effect.
 * @property {string} target.template.units      Units used to measure the area of effect sizes.
 * @property {object} target.affects
 * @property {string} target.affects.count       Number of individual targets that can be affected.
 * @property {string} target.affects.type        Type of targets that can be affected (e.g. creatures, objects, spaces).
 * @property {boolean} target.affects.choice     When targeting an area, can the user choose who it affects?
 * @property {string} target.affects.special     Description of special targeting.
 * @property {boolean} target.prompt             Should the player be prompted to place the template?
 * @property {object} uses
 * @property {number} uses.spent                 Number of uses that have been spent.
 * @property {string} uses.max                   Formula for the maximum number of uses.
 * @property {UsesRecoveryData[]} uses.recovery  Recovery profiles for this activity's uses.
 */
export default class BaseActivityData extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ACTIVITY", "DND5E.USES"];

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
      activation: new SchemaField({
        type: new StringField({ initial: "action" }),
        value: new NumberField({ min: 0, integer: true }),
        condition: new StringField()
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
      duration: new SchemaField({
        value: new FormulaField({ deterministic: true }),
        units: new StringField({ initial: "inst" }),
        special: new StringField()
      }),
      effects: new ArrayField(new SchemaField({
        id: new DocumentIdField()
      })),
      range: new SchemaField({
        value: new FormulaField({ deterministic: true }),
        units: new StringField(),
        special: new StringField()
      }),
      target: new SchemaField({
        template: new SchemaField({
          count: new FormulaField({ deterministic: true }),
          contiguous: new BooleanField(),
          type: new StringField(),
          size: new FormulaField({ deterministic: true }),
          width: new FormulaField({ deterministic: true }),
          height: new FormulaField({ deterministic: true }),
          units: new StringField({ initial: "ft" })
        }),
        affects: new SchemaField({
          count: new FormulaField({ deterministic: true }),
          type: new StringField(),
          choice: new BooleanField(),
          special: new StringField()
        }),
        prompt: new BooleanField({ initial: true })
      }),
      uses: new UsesField()
    };
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
    const item = this.item;
    this.effects?.forEach(e => Object.defineProperty(e, "effect", {
      get() { return item.effects.get(e.id); },
      configurable: true
    }));
    UsesField.prepareData.call(this, this.getRollData({ deterministic: true }));
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
      { value: "", label: makeLabel(game.i18n.localize("DND5E.Consumption.Target.ThisItem"), this.item) },
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
