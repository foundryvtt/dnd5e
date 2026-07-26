import D20RollModificationField from "./d20-roll-modification-field.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing data for a specific type of roll.
 */
export default class RollConfigField extends SchemaField {
  constructor({ ability="", roll={}, ...fields }={}, {
    labelPrefix, labelFormatterPrefix="DND5E.ROLL.Formatter.", ...options
  }={}) {
    fields = {
      ability: (ability === false) ? null : new StringField({
        required: true,
        initial: ability,
        label: "DND5E.AbilityModifier",
        labelFormatter: `${labelFormatterPrefix}ModifierAbility`
      }),
      roll: new D20RollModificationField(roll, { labelPrefix, labelFormatterPrefix, required: true }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
