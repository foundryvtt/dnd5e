import SystemDataModel from "../abstract.mjs";
import { AdvancementField, IdentifierField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Class items.
 * @mixes ItemDescriptionTemplate
 *
 * @property {string} identifier        Identifier slug for this class.
 * @property {number} levels            Current number of levels in this class.
 * @property {string} hitDice           Denomination of hit dice available as defined in `DND5E.hitDieTypes`.
 * @property {number} hitDiceUsed       Number of hit dice consumed.
 * @property {object[]} advancement     Advancement objects for this class.
 * @property {object} spellcasting      Details on class's spellcasting ability.
 * @property {string} spellcasting.progression  Spell progression granted by class as from `DND5E.spellProgression`.
 * @property {string} spellcasting.ability      Ability score to use for spellcasting.
 */
export default class ClassData extends SystemDataModel.mixin(ItemDescriptionTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      levels: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 1, label: "DND5E.ClassLevels"
      }),
      hitDice: new foundry.data.fields.StringField({
        required: true, initial: "d6", blank: false, label: "DND5E.HitDice",
        validate: v => /d\d+/.test(v), validationError: "must be a dice value in the format d#"
      }),
      hitDiceUsed: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.HitDiceUsed"
      }),
      advancement: new foundry.data.fields.ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"}),
      spellcasting: new foundry.data.fields.SchemaField({
        progression: new foundry.data.fields.StringField({
          required: true, initial: "none", blank: false, label: "DND5E.SpellProgression"
        }),
        ability: new foundry.data.fields.StringField({required: true, label: "DND5E.SpellAbility"})
      }, {label: "DND5E.Spellcasting"})
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ClassData.#migrateLevels(source);
    ClassData.#migrateSpellcastingData(source);
    ClassData.#migrateTraitAdvancement(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the class levels.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateLevels(source) {
    if ( typeof source.levels !== "string" ) return;
    if ( source.levels === "" ) source.levels = 1;
    else if ( Number.isNumeric(source.levels) ) source.levels = Number(source.levels);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the class's spellcasting string to object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSpellcastingData(source) {
    if ( source.spellcasting?.progression === "" ) source.spellcasting.progression = "none";
    if ( typeof source.spellcasting !== "string" ) return;
    source.spellcasting = {
      progression: source.spellcasting,
      ability: ""
    };
  }

  /* -------------------------------------------- */

  /**
   * Migrate the class's saves & skills into TraitAdvancements.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateTraitAdvancement(source) {
    source.advancement ??= [];
    if ( source.advancement.find(a => a.type === "Trait") ) return;

    if ( source.saves?.length ) {
      const savesData = {
        type: "Trait",
        configuration: {
          grants: source.saves.map(t => `saves:${t}`)
        }
      };
      savesData.value = {
        chosen: savesData.configuration.grants
      };
      source.advancement.push(savesData);
      delete source.saves;
    }

    if ( source.skills?.choices?.length ) {
      const skillsData = {
        type: "Trait",
        configuration: {
          choices: [{
            count: source.skills.number ?? 1,
            pool: source.skills.choices.map(t => `skills:${t}`)
          }]
        }
      };
      if ( source.skills.value?.length ) {
        skillsData.value = {
          chosen: source.skills.value.map(t => `skills:${t}`)
        };
      }
      source.advancement.push(skillsData);
      delete source.skills;
    }
  }
}
