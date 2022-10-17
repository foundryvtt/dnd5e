import { FormulaField } from "../fields.mjs";

/**
 * An embedded data structure for actor ability scores.
 * @see ActorData5e
 *
 * @property {number} value          Ability score.
 * @property {number} proficient     Proficiency value for saves.
 * @property {object} bonuses        Bonuses that modify ability checks and saves.
 * @property {string} bonuses.check  Numeric or dice bonus to ability checks.
 * @property {string} bonuses.save   Numeric or dice bonus to ability saving throws.
 */
export default class AbilityData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.AbilityScore"
      }),
      proficient: new foundry.data.fields.NumberField({required: true, initial: 0, label: "DND5E.ProficiencyLevel"}),
      bonuses: new foundry.data.fields.SchemaField({
        check: new FormulaField({required: true, label: "DND5E.AbilityCheckBonus"}),
        save: new FormulaField({required: true, label: "DND5E.SaveBonus"})
      }, {label: "DND5E.AbilityBonuses"})
    };
  }
}
