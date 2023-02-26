import SystemDataModel from "../../abstract.mjs";
import { FormulaField, MappingField } from "../../fields.mjs";
import CurrencyTemplate from "../../shared/currency.mjs";

/**
 * @typedef {object} AbilityData
 * @property {number} value          Ability score.
 * @property {number} proficient     Proficiency value for saves.
 * @property {object} bonuses        Bonuses that modify ability checks and saves.
 * @property {string} bonuses.check  Numeric or dice bonus to ability checks.
 * @property {string} bonuses.save   Numeric or dice bonus to ability saving throws.
 */

/**
 * A template for all actors that share the common template.
 *
 * @property {Object<string, AbilityData>} abilities  Actor's abilities.
 * @mixin
 */
export default class CommonTemplate extends SystemDataModel.mixin(CurrencyTemplate) {

  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      abilities: new MappingField(new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.AbilityScore"
        }),
        proficient: new foundry.data.fields.NumberField({required: true, initial: 0, label: "DND5E.ProficiencyLevel"}),
        bonuses: new foundry.data.fields.SchemaField({
          check: new FormulaField({required: true, label: "DND5E.AbilityCheckBonus"}),
          save: new FormulaField({required: true, label: "DND5E.SaveBonus"})
        }, {label: "DND5E.AbilityBonuses"})
      }), {initialKeys: CONFIG.DND5E.abilities, label: "DND5E.Abilities"})
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    super.migrateData(source);
    CommonTemplate.#migrateACData(source);
    CommonTemplate.#migrateMovementData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor ac.value to new ac.flat override field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateACData(source) {
    if ( !source.attributes?.ac ) return;
    const ac = source.attributes.ac;

    // If the actor has a numeric ac.value, then their AC has not been migrated to the auto-calculation schema yet.
    if ( Number.isNumeric(ac.value) ) {
      ac.flat = parseInt(ac.value);
      ac.calc = this._systemType === "npc" ? "natural" : "flat";
      return;
    }

    // Migrate ac.base in custom formulas to ac.armor
    if ( (typeof ac.formula === "string") && ac.formula.includes("@attributes.ac.base") ) {
      ac.formula = ac.formula.replaceAll("@attributes.ac.base", "@attributes.ac.armor");
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor speed string to movement object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMovementData(source) {
    const original = source.attributes?.speed?.value ?? source.attributes?.speed;
    if ( (typeof original !== "string") || (source.attributes.movement?.walk !== undefined) ) return;
    source.attributes.movement ??= {};
    const s = original.split(" ");
    if ( s.length > 0 ) source.attributes.movement.walk = Number.isNumeric(s[0]) ? parseInt(s[0]) : 0;
  }
}
