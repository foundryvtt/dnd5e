const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {object} MovementData
 * @property {number} burrow                Actor burrowing speed.
 * @property {number} climb                 Actor climbing speed.
 * @property {number} fly                   Actor flying speed.
 * @property {number} swim                  Actor swimming speed.
 * @property {number} walk                  Actor walking speed.
 * @property {CustomMovementData[]} custom  Custom movement types.
 * @property {string} special               Semi-colon separated list of special movement information.
 * @property {string} units                 Movement used to measure the various speeds.
 * @property {boolean} hover                This flying creature able to hover in place.
 */

/**
 * @typedef CustomMovementData
 * @property {string} label  Label for custom movement.
 * @property {number} value  Movement speed.
 */

/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    const numberConfig = { required: true, nullable: true, min: 0, step: 0.1, initial: null };
    fields = {
      burrow: new NumberField({ ...numberConfig, label: "DND5E.MovementBurrow" }),
      climb: new NumberField({ ...numberConfig, label: "DND5E.MovementClimb" }),
      fly: new NumberField({ ...numberConfig, label: "DND5E.MovementFly" }),
      swim: new NumberField({ ...numberConfig, label: "DND5E.MovementSwim" }),
      walk: new NumberField({ ...numberConfig, label: "DND5E.MovementWalk" }),
      custom: new ArrayField(new SchemaField({
        label: new StringField(),
        value: new NumberField({ ...numberConfig })
      })),
      special: new StringField(),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.MovementUnits"
      }),
      hover: new BooleanField({ required: true, label: "DND5E.MovementHover" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Movement", ...options });
  }
}
