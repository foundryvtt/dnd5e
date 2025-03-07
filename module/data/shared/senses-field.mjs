import MappingField from "../fields/mapping-field.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * @typedef {object} SensesData
 * @property {number} darkvision       Creature's darkvision range.
 * @property {number} blindsight       Creature's blindsight range.
 * @property {number} tremorsense      Creature's tremorsense range.
 * @property {number} truesight        Creature's truesight range.
 * @property {string} units            Distance units used to measure senses.
 * @property {string} special          Description of any special senses or restrictions.
 */

/**
 * Field for storing senses data.
 */
export default class SensesField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    const types = new MappingField(new NumberField({
      required: true, nullable: true, integer: true, min: 0, initial: null
    }), { initialKeys: CONFIG.DND5E.senses, initialKeysOnly: true });

    fields = {
      types,
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.SenseUnits"
      }),
      special: new StringField({ required: true, label: "DND5E.SenseSpecial" }),
      ...fields
    };

    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Senses", ...options });
  }
}
