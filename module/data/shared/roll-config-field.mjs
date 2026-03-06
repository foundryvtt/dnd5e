import AdvantageModeField from "../fields/advantage-mode-field.mjs";

const { StringField, NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing data for a specific type of roll.
 */
export default class RollConfigField extends foundry.data.fields.SchemaField {
  constructor({ roll={}, ability="", labelFormatterPrefix="DND5E.ROLL.Formatter.", ...fields }={}, options={}) {
    const opts = { initial: null, nullable: true, min: 1, max: 20, integer: true };
    fields = {
      ability: (ability === false) ? null : new StringField({
        required: true,
        initial: ability,
        label: "DND5E.AbilityModifier",
        labelFormatter: `${labelFormatterPrefix}ModifierAbility`
      }),
      roll: new SchemaField({
        min: new NumberField({
          ...opts, label: "DND5E.ROLL.Range.Minimum", labelFormatter: `${labelFormatterPrefix}Minimum`
        }),
        max: new NumberField({
          ...opts, label: "DND5E.ROLL.Range.Maximum", labelFormatter: `${labelFormatterPrefix}Maximum`
        }),
        mode: new AdvantageModeField({ labelFormatter: `${labelFormatterPrefix}AdvantageMode` }),
        ...roll
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
