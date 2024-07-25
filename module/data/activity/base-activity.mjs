import { FormulaField } from "../fields.mjs";

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
 * @property {object} uses
 * @property {number} uses.spent                 Number of uses that have been spent.
 * @property {string} uses.max                   Formula for the maximum number of uses.
 * @property {UsesRecoveryData[]} uses.recovery  Recovery profiles for this activity's uses.
 */
export default class BaseActivity extends foundry.abstract.DataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ACTIVITY"];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
      type: new StringField({
        blank: false,
        required: true,
        readOnly: true
      }),
      name: new StringField({initial: undefined}),
      img: new FilePathField({initial: undefined, categories: ["IMAGE"]}),
      activation: new SchemaField({
        type: new StringField(),
        value: new NumberField({min: 0, integer: true}),
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
        units: new StringField(),
        special: new StringField()
      }),
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
        })
      }),
      uses: new SchemaField({
        spent: new NumberField({ initial: 0, integer: true }),
        max: new FormulaField({ deterministic: true }),
        recovery: new ArrayField(
          new SchemaField({
            period: new StringField({ initial: "lr" }),
            type: new StringField({ initial: "recoverAll" }),
            formula: new FormulaField()
          })
        )
      })
    };
  }
}
