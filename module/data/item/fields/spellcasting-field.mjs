import { FormulaField } from "../../fields.mjs";
import { simplifyBonus } from "../../../utils.mjs";
const { StringField } = foundry.data.fields;
/**
 * @typedef {{
 * progression:string,
 * ability:string,
 * preparationFormula:string
 * }} spellcasting
 */
/**
 * Shared contents of the spellcasting schema.
 */
export default class SpellcastingField extends foundry.data.fields.SchemaField {
  constructor(fields = {}, options = {}) {
    fields = {
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
        deterministic: true,
        label: "DND5E.SpellPreparation.Formula"
      }),
      ...fields
    };
    fields = Object.entries(fields)
      .filter(([, v]) => Boolean(v))
      .reduce(
        (prev, [k, v]) => ({
          ...prev,
          [k]: v
        }),
        {}
      );
    super(fields, { label: "DND5E.Spellcasting", ...options });
  }

  /**
   * Calculate total preparation limit.
   * @param {spellcasting} spellcasting Spellcasting data for this object.
   * @param {object} rollData           Roll data for the actor being prepared.
   * @returns {number|null}
   */
  static calculatePreparationLimit(spellcasting, rollData) {
    if (spellcasting.preparationFormula) {
      return simplifyBonus(spellcasting.preparationFormula, rollData);
    }
    return null;
  }
}
