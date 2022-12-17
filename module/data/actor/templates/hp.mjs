import SystemDataModel from "../../abstract.mjs";
import { FormulaField } from "../../fields.mjs";

/**
 *
 */
export default class HPField extends foundry.data.fields.SchemaField {
  constructor(type, options) {
    let extraFields;
    let initial;
    if ( type === "character" ) {
      extraFields = {};
      initial = 0;
    } else if ( type === "npc" ) {
      extraFields = HPField.npcFields();
      initial = 10;
    } else if ( type === "vehicle" ) {
      extraFields = HPField.vehicleFields();
      initial = null;
    } else {
      throw new Error(`An unrecognized type ${type} was passed to AttributesField constructor.`);
    }
    super(SystemDataModel.mergeSchema({
      value: new foundry.data.fields.NumberField({
        nullable: type === "vehicle", integer: true, min: 0, initial, label: "DND5E.HitPointsCurrent"
      }),
      min: new foundry.data.fields.NumberField({
        nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.HitPointsMin"
      }),
      max: new foundry.data.fields.NumberField({
        nullable: type === "vehicle", integer: true, min: 0, initial, label: "DND5E.HitPointsMax"
      }),
      temp: new foundry.data.fields.NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
      tempmax: new foundry.data.fields.NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"})
    }, extraFields), options);
  }

  /* -------------------------------------------- */

  static npcFields() {
    return {
      formula: new FormulaField({required: true, label: ""})
    };
  }

  /* -------------------------------------------- */

  static vehicleFields() {
    return {
      dt: new foundry.data.fields.NumberField({
        required: true, integer: true, min: 0, label: "DND5E.DamageThreshold"
      }),
      mt: new foundry.data.fields.NumberField({
        required: true, integer: true, min: 0, label: "DND5E.VehicleMishapThreshold"
      })
    };
  }
}
