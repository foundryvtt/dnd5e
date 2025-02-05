import AdvantageModeField from "../fields/advantage-mode-field.mjs";

const { StringField, NumberField, SchemaField } = foundry.data.fields;

/**
 * @typedef {object} RollConfigData
 * @property {string} [ability]  Default ability associated with this roll.
 * @property {object} roll
 * @property {number} roll.min   Minimum number on the die rolled.
 * @property {number} roll.max   Maximum number on the die rolled.
 * @property {number} roll.mode  Should the roll be with disadvantage or advantage by default?
 */

/**
 * Field for storing data for a specific type of roll.
 */
export default class RollConfigField extends foundry.data.fields.SchemaField {
  constructor({roll={}, ability="", ...fields}={}, options={}) {
    const opts = { initial: null, nullable: true, min: 1, max: 20, integer: true };
    fields = {
      ability: (ability === false) ? null : new StringField({
        required: true,
        initial: ability,
        label: "DND5E.AbilityModifier"
      }),
      roll: new SchemaField({
        min: new NumberField({...opts, label: "DND5E.ROLL.Range.Minimum"}),
        max: new NumberField({...opts, label: "DND5E.ROLL.Range.Maximum"}),
        mode: new AdvantageModeField(),
        ...roll
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
