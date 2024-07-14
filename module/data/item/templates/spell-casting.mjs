const { SchemaField, StringField, BooleanField } = foundry.data.fields;

/**
 * Shared contents of the spellcasting schema.
 */
export default class SpellCastingFields {

  /**
   * Shared fields for spellcasting definition.
   * @type {object}
   * @property {string} progression
   * @property {string} ability
   * @property {boolean} needToPrepare
   */
  static get spellCasting() {
    return new SchemaField(
      {
        progression: new StringField({
          required: true,
          initial: "none",
          blank: false,
          label: "DND5E.SpellProgression"
        }),
        ability: new StringField({
          required: true,
          label: "DND5E.SpellAbility"
        }),
        preparationFormula: new FormulaField({
          deterministic: true
          label: "DND5E.SpellPreparation.Formula"
        })
      },
      { label: "DND5E.Spellcasting" }
    );
  }
}
