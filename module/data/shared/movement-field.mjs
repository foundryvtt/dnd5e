const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, options={}) {
    const numberConfig = { required: true, nullable: true, min: 0, step: 0.1, initial: null };
    fields = {
      burrow: new NumberField({ ...numberConfig, label: "DND5E.MovementBurrow" }),
      climb: new NumberField({ ...numberConfig, label: "DND5E.MovementClimb" }),
      fly: new NumberField({ ...numberConfig, label: "DND5E.MovementFly" }),
      swim: new NumberField({ ...numberConfig, label: "DND5E.MovementSwim" }),
      walk: new NumberField({ ...numberConfig, label: "DND5E.MovementWalk" }),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: null, label: "DND5E.MovementUnits"
      }),
      hover: new BooleanField({ required: true, label: "DND5E.MovementHover" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Movement", ...options });
  }
}
