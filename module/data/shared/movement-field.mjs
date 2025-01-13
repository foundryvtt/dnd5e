import MappingField from "../fields/mapping-field.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    const types = new MappingField(new NumberField({
      required: true, nullable: true, min: 0, step: 0.1, initial: null
    }), { initialKeys: CONFIG.DND5E.movementTypes, initialKeysOnly: true });

    fields = {
      types,
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
