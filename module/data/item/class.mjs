import TraitAdvancement from "../../documents/advancement/trait.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { AdvancementField, FormulaField, IdentifierField } from "../fields.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import StartingEquipmentTemplate from "./templates/starting-equipment.mjs";

const { ArrayField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data definition for Class items.
 * @mixes ItemDescriptionTemplate
 * @mixes StartingEquipmentTemplate
 *
 * @property {string} identifier        Identifier slug for this class.
 * @property {number} levels            Current number of levels in this class.
 * @property {string} hitDice           Denomination of hit dice available as defined in `DND5E.hitDieTypes`.
 * @property {number} hitDiceUsed       Number of hit dice consumed.
 * @property {object[]} advancement     Advancement objects for this class.
 * @property {object} spellcasting      Details on class's spellcasting ability.
 * @property {string} spellcasting.progression  Spell progression granted by class as from `DND5E.spellProgression`.
 * @property {string} spellcasting.ability      Ability score to use for spellcasting.
 * @property {string} wealth            Formula used to determine starting wealth.
 */
export default class ClassData extends ItemDataModel.mixin(ItemDescriptionTemplate, StartingEquipmentTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      identifier: new IdentifierField({required: true, label: "DND5E.Identifier"}),
      levels: new NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 1, label: "DND5E.ClassLevels"
      }),
      hitDice: new StringField({
        required: true, initial: "d6", blank: false, label: "DND5E.HitDice",
        validate: v => /d\d+/.test(v), validationError: "must be a dice value in the format d#"
      }),
      hitDiceUsed: new NumberField({
        required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.HitDiceUsed"
      }),
      advancement: new ArrayField(new AdvancementField(), {label: "DND5E.AdvancementTitle"}),
      spellcasting: new SchemaField({
        progression: new StringField({
          required: true, initial: "none", blank: false, label: "DND5E.SpellProgression"
        }),
        ability: new StringField({required: true, label: "DND5E.SpellAbility"}),
        preparedSpellsLimitFormula: new StringField({
          required: false, label: "DND5E.PreparedSpellsLimitFormula"
        })
      }, {label: "DND5E.Spellcasting"}),
      wealth: new FormulaField({label: "DND5E.StartingEquipment.Wealth.Label"})
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    const context = await super.getFavoriteData();
    if ( this.parent.subclass ) context.subtitle = this.parent.subclass.name;
    context.value = this.levels;
    return context;
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ClassData.#migrateLevels(source);
    ClassData.#migrateSpellcastingData(source);
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
   * @protected
   */
  static _migrateTraitAdvancement(source) {
    const system = source.system;
    if ( !system?.advancement || system.advancement.find(a => a.type === "Trait") ) return;
    let needsMigration = false;

    if ( system.saves?.length ) {
      const savesData = {
        type: "Trait",
        level: 1,
        configuration: {
          grants: system.saves.map(t => `saves:${t}`)
        }
      };
      savesData.value = {
        chosen: savesData.configuration.grants
      };
      system.advancement.push(new TraitAdvancement(savesData).toObject());
      delete system.saves;
      needsMigration = true;
    }

    if ( system.skills?.choices?.length ) {
      const skillsData = {
        type: "Trait",
        level: 1,
        configuration: {
          choices: [{
            count: system.skills.number ?? 1,
            pool: system.skills.choices.map(t => `skills:${t}`)
          }]
        }
      };
      if ( system.skills.value?.length ) {
        skillsData.value = {
          chosen: system.skills.value.map(t => `skills:${t}`)
        };
      }
      system.advancement.push(new TraitAdvancement(skillsData).toObject());
      delete system.skills;
      needsMigration = true;
    }

    if ( needsMigration ) foundry.utils.setProperty(source, "flags.dnd5e.persistSourceMigration", true);
  }
}
