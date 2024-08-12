import { FormulaField } from "../../fields.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Data field for class & subclass spellcasting information.
 *
 * @property {string} progression          Spellcasting progression (e.g. full, half, pact).
 * @property {string} ability              Ability used for spell attacks and save DCs.
 * @property {object} preparation
 * @property {string} preparation.formula  Formula used to calculate max prepared spells, if a prepared caster.
 */
export default class SpellcastingField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      progression: new StringField({
        initial: "none",
        blank: false,
        label: "DND5E.SpellProgression"
      }),
      ability: new StringField({ label: "DND5E.SpellAbility" }),
      preparation: new SchemaField({
        formula: new FormulaField({ label: "DND5E.SpellPreparation.Formula" })
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Spellcasting", ...options });
  }
}
