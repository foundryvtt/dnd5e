import D2RollModificationField from "./d20-roll-modification-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * @import { D20RollModificationData } from "./d20-roll-modification-field.mjs";
 */

/**
 * @typedef RollConfigData
 * @property {string} [ability]  Default ability associated with this roll.
 * @property {Omit<D20RollModificationData, "bonus">} roll
 */

/**
 * Field for storing data for a specific type of roll.
 */
export default class RollConfigField extends SchemaField {
  constructor({roll={}, ability="", ...fields}={}, options={}) {
    fields = {
      ability: (ability === false) ? null : new StringField({
        required: true,
        initial: ability,
        label: "DND5E.AbilityModifier"
      }),
      roll: new D2RollModificationField({ bonus: false, ...roll }, { required: true }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
