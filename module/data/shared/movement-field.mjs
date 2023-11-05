/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const numberConfig = { nullable: false, min: 0, step: 0.1, initial: 0 };
    fields = {
      burrow: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.MovementBurrow" }),
      climb: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.MovementClimb" }),
      fly: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.MovementFly" }),
      swim: new foundry.data.fields.NumberField({ ...numberConfig, label: "DND5E.MovementSwim" }),
      walk: new foundry.data.fields.NumberField({ ...numberConfig, initial: 30, label: "DND5E.MovementWalk" }),
      units: new foundry.data.fields.StringField({initial: "ft", label: "DND5E.MovementUnits"}),
      hover: new foundry.data.fields.BooleanField({label: "DND5E.MovementHover"}),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Movement", ...options });
  }
}
