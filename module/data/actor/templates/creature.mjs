import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import CommonTemplate from "./common.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @typedef {object} SkillData
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {string} ability          Default ability used for this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.check    Numeric or dice bonus to skill's check.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */

/**
 * A template for all actors that are creatures
 *
 * @property {object} bonuses
 * @property {AttackBonusesData} bonuses.mwak        Bonuses to melee weapon attacks.
 * @property {AttackBonusesData} bonuses.rwak        Bonuses to ranged weapon attacks.
 * @property {AttackBonusesData} bonuses.msak        Bonuses to melee spell attacks.
 * @property {AttackBonusesData} bonuses.rsak        Bonuses to ranged spell attacks.
 * @property {object} bonuses.abilities              Bonuses to ability scores.
 * @property {string} bonuses.abilities.check        Numeric or dice bonus to ability checks.
 * @property {string} bonuses.abilities.save         Numeric or dice bonus to ability saves.
 * @property {string} bonuses.abilities.skill        Numeric or dice bonus to skill checks.
 * @property {object} bonuses.spell                  Bonuses to spells.
 * @property {string} bonuses.spell.dc               Numeric bonus to spellcasting DC.
 * @property {Object<string, SkillData>} skills      Actor's skills.
 * @property {Object<string, SpellSlotData>} spells  Actor's spell slots.
 */
export default class CreatureTemplate extends CommonTemplate {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      bonuses: new SchemaField({
        mwak: makeAttackBonuses({ label: "DND5E.BonusMWAttack" }),
        rwak: makeAttackBonuses({ label: "DND5E.BonusRWAttack" }),
        msak: makeAttackBonuses({ label: "DND5E.BonusMSAttack" }),
        rsak: makeAttackBonuses({ label: "DND5E.BonusRSAttack" }),
        abilities: new SchemaField({
          check: new FormulaField({ required: true, label: "DND5E.BonusAbilityCheck" }),
          save: new FormulaField({ required: true, label: "DND5E.BonusAbilitySave" }),
          skill: new FormulaField({ required: true, label: "DND5E.BonusAbilitySkill" })
        }, { label: "DND5E.BonusAbility" }),
        spell: new SchemaField({
          dc: new FormulaField({ required: true, deterministic: true, label: "DND5E.BonusSpellDC" })
        }, { label: "DND5E.BonusSpell" })
      }, { label: "DND5E.Bonuses" }),
      skills: new MappingField(new RollConfigField({
        value: new NumberField({
          required: true, nullable: false, min: 0, max: 2, step: 0.5, initial: 0, label: "DND5E.ProficiencyLevel"
        }),
        ability: "dex",
        bonuses: new SchemaField({
          check: new FormulaField({ required: true, label: "DND5E.SkillBonusCheck" }),
          passive: new FormulaField({ required: true, label: "DND5E.SkillBonusPassive" })
        }, { label: "DND5E.SkillBonuses" })
      }), {
        initialKeys: CONFIG.DND5E.skills, initialValue: this._initialSkillValue,
        initialKeysOnly: true, label: "DND5E.Skills"
      }),
      tools: new MappingField(new RollConfigField({
        value: new NumberField({
          required: true, nullable: false, min: 0, max: 2, step: 0.5, initial: 1, label: "DND5E.ProficiencyLevel"
        }),
        ability: "int",
        bonuses: new SchemaField({
          check: new FormulaField({ required: true, label: "DND5E.CheckBonus" })
        }, { label: "DND5E.ToolBonuses" })
      })),
      spells: new MappingField(new SchemaField({
        value: new NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellProgAvailable"
        }),
        override: new NumberField({
          integer: true, min: 0, label: "DND5E.SpellProgOverride"
        })
      }), { initialKeys: this._spellLevels, label: "DND5E.SpellLevels" })
    });
  }

  /* -------------------------------------------- */

  /**
   * Populate the proper initial abilities for the skills.
   * @param {string} key      Key for which the initial data will be created.
   * @param {object} initial  The initial skill object created by SkillData.
   * @returns {object}        Initial skills object with the ability defined.
   * @private
   */
  static _initialSkillValue(key, initial) {
    if ( CONFIG.DND5E.skills[key]?.ability ) initial.ability = CONFIG.DND5E.skills[key].ability;
    return initial;
  }

  /* -------------------------------------------- */

  /**
   * Helper for building the default list of spell levels.
   * @type {string[]}
   * @private
   */
  static get _spellLevels() {
    const levels = Object.keys(CONFIG.DND5E.spellLevels).filter(a => a !== "0").map(l => `spell${l}`);
    return [...levels, "pact"];
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    CreatureTemplate.#migrateSensesData(source);
    CreatureTemplate.#migrateToolData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor traits.senses string to attributes.senses object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSensesData(source) {
    const original = source.traits?.senses;
    if ( (original === undefined) || (typeof original !== "string") ) return;
    source.attributes ??= {};
    source.attributes.senses ??= {};

    // Try to match old senses with the format like "Darkvision 60 ft, Blindsight 30 ft"
    const pattern = /([A-z]+)\s?([0-9]+)\s?([A-z]+)?/;
    let wasMatched = false;

    // Match each comma-separated term
    for ( let s of original.split(",") ) {
      s = s.trim();
      const match = s.match(pattern);
      if ( !match ) continue;
      const type = match[1].toLowerCase();
      if ( (type in CONFIG.DND5E.senses) && !(type in source.attributes.senses) ) {
        source.attributes.senses[type] = Number(match[2]).toNearest(0.5);
        wasMatched = true;
      }
    }

    // If nothing was matched, but there was an old string - put the whole thing in "special"
    if ( !wasMatched && original ) source.attributes.senses.special = original;
  }

  /* -------------------------------------------- */

  /**
   * Migrate traits.toolProf to the tools field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateToolData(source) {
    const original = source.traits?.toolProf;
    if ( !original || foundry.utils.isEmpty(original.value) ) return;
    source.tools ??= {};
    for ( const prof of original.value ) {
      const validProf = (prof in CONFIG.DND5E.toolProficiencies) || (prof in CONFIG.DND5E.toolIds);
      if ( !validProf || (prof in source.tools) ) continue;
      source.tools[prof] = {
        value: 1,
        ability: "int",
        bonuses: {check: ""}
      };
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritdoc */
  getRollData({ deterministic=false }={}) {
    const data = super.getRollData({ deterministic });
    data.classes = {};
    for ( const [identifier, cls] of Object.entries(this.parent.classes) ) {
      data.classes[identifier] = {...cls.system};
      if ( cls.subclass ) data.classes[identifier].subclass = cls.subclass.system;
    }
    return data;
  }
}

/* -------------------------------------------- */

/**
 * Data on configuration of a specific spell slot.
 *
 * @typedef {object} SpellSlotData
 * @property {number} value     Currently available spell slots.
 * @property {number} override  Number to replace auto-calculated max slots.
 */

/* -------------------------------------------- */

/**
 * Data structure for actor's attack bonuses.
 *
 * @typedef {object} AttackBonusesData
 * @property {string} attack  Numeric or dice bonus to attack rolls.
 * @property {string} damage  Numeric or dice bonus to damage rolls.
 */

/**
 * Produce the schema field for a simple trait.
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {AttackBonusesData}
 */
function makeAttackBonuses(schemaOptions={}) {
  return new SchemaField({
    attack: new FormulaField({required: true, label: "DND5E.BonusAttack"}),
    damage: new FormulaField({required: true, label: "DND5E.BonusDamage"})
  }, schemaOptions);
}
