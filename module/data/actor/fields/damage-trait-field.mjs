import SimpleTraitField from "./simple-trait-field.mjs";
const { SetField, StringField } = foundry.data.fields;

/**
 * Data structure for a damage actor trait.
 *
 * @typedef {import("./simple-trait.mjs").SimpleTraitData} DamageTraitData
 * @property {Set<string>} bypasses  Keys for physical weapon properties that cause resistances to be bypassed.
 */

/**
 * Field for storing damage resistances, immunities, and vulnerabilities data.
 */
export default class DamageTraitField extends SimpleTraitField {
  constructor(fields={}, { initialBypasses=[], ...options }={}) {
    super({
      bypasses: new SetField(new StringField(), {
        label: "DND5E.DamagePhysicalBypass", hint: "DND5E.DamagePhysicalBypassHint", initial: initialBypasses
      })
    }, options);
  }
}
