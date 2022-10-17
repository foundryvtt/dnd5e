import { FormulaField } from "../fields.mjs";

/**
 * An embedded data structure for individual skill data.
 *
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {string} ability          Default ability used for this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.check    Numeric or dice bonus to skill's check.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */
export default class SkillData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({required: true, initial: 0, label: "DND5E.ProficiencyLevel"}),
      // TODO: Default abilities for skills are not filled properly
      ability: new foundry.data.fields.StringField({required: true, initial: "dex", label: "DND5E.Ability"}),
      bonuses: new foundry.data.fields.SchemaField({
        check: new FormulaField({required: true, label: "DND5E.SkillBonusCheck"}),
        passive: new FormulaField({required: true, label: "DND5E.SkillBonusPassive"})
      }, {label: "DND5E.SkillBonuses"})
    };
  }
}
