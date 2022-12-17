import SystemDataModel from "../../abstract.mjs";
import { FormulaField } from "../../fields.mjs";
import HPField from "./hp.mjs";

/**
 *
 */
export default class AttributesField extends foundry.data.fields.SchemaField {
  constructor(extraSchema, options) {
    const extraFields = SystemDataModel.mergeSchema(
      options.type !== "vehicle" ? AttributesField.creatureFields() : {},
      extraSchema
    );
    const extraACFields = options.type === "vehicle" ? {
      motionless: new foundry.data.fields.StringField({required: true, label: "DND5E.ArmorClassMotionless"})
    } : {};
    super(SystemDataModel.mergeSchema({
      ac: new foundry.data.fields.SchemaField(SystemDataModel.mergeSchema({
        flat: new foundry.data.fields.NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
        calc: new foundry.data.fields.StringField({
          initial: options.type === "vehicle" ? "flat" : "default", label: "DND5E.ArmorClassCalculation"
        }),
        formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
      }, extraACFields)),
      hp: new HPField(options.type, {
        label: "DND5E.HitPoints", validate: d => d.min <= d.max,
        validationError: "HP minimum must be less than HP maximum"
      }),
      init: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          nullable: false, integer: true, initial: 0, label: "DND5E.Initiative"
        }),
        bonus: new foundry.data.fields.NumberField({
          nullable: false, integer: true, initial: 0, label: "DND5E.InitiativeBonus"
        })
      }, { label: "DND5E.Initiative" }),
      movement: new foundry.data.fields.SchemaField({
        burrow: new foundry.data.fields.NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementBurrow"
        }),
        climb: new foundry.data.fields.NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementClimb"
        }),
        fly: new foundry.data.fields.NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementFly"
        }),
        swim: new foundry.data.fields.NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.MovementSwim"
        }),
        walk: new foundry.data.fields.NumberField({
          nullable: false, integer: true, min: 0, initial: 30, label: "DND5E.MovementWalk"
        }),
        units: new foundry.data.fields.StringField({initial: "ft", label: "DND5E.MovementUnits"}),
        hover: new foundry.data.fields.BooleanField({label: "DND5E.MovementHover"})
      }, {label: "DND5E.Movement"})
    }, extraFields), options);
  }

  /* -------------------------------------------- */

  static creatureFields() {
    return {
      attunement: new foundry.data.fields.SchemaField({
        max: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 3, label: "DND5E.AttunementMax"
        })
      }, {label: "DND5E.Attunement"}),
      senses: new foundry.data.fields.SchemaField({
        darkvision: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseDarkvision"
        }),
        blindsight: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseBlindsight"
        }),
        tremorsense: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseTremorsense"
        }),
        truesight: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseTruesight"
        }),
        units: new foundry.data.fields.StringField({required: true, initial: "ft", label: "DND5E.SenseUnits"}),
        special: new foundry.data.fields.StringField({required: true, label: "DND5E.SenseSpecial"})
      }, {label: "DND5E.Senses"}),
      spellcasting: new foundry.data.fields.StringField({
        required: true, blank: true, initial: "int", label: "DND5E.SpellAbility"
      })
    };
  }
}
