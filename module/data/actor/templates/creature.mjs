import { simplifyBonus } from "../../../utils.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import CommonTemplate from "./common.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

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
 * @property {Record<string, ToolData>} tools        Actor's tools.
 * @property {Record<string, SkillData>} skills      Actor's skills.
 * @property {Record<string, SpellSlotData>} spells  Actor's spell slots.
 */
export default class CreatureTemplate extends CommonTemplate {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      bonuses: new SchemaField({
        mwak: makeAttackBonuses(),
        rwak: makeAttackBonuses(),
        msak: makeAttackBonuses(),
        rsak: makeAttackBonuses(),
        abilities: new SchemaField({
          check: new FormulaField({ required: true }),
          save: new FormulaField({ required: true }),
          skill: new FormulaField({ required: true })
        }),
        spell: new SchemaField({
          dc: new FormulaField({ required: true, deterministic: true })
        })
      }),
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
          required: true, nullable: false, min: 0, max: 2, step: 0.5, initial: 0, label: "DND5E.ProficiencyLevel"
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

  /**
   * Whether this Actor type represents a creature.
   * @returns {boolean}
   */
  get isCreature() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
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
      const validProf = (prof in CONFIG.DND5E.toolProficiencies) || (prof in CONFIG.DND5E.tools);
      if ( !validProf || (prof in source.tools) ) continue;
      source.tools[prof] = {
        value: 1,
        ability: "int",
        bonuses: {check: ""}
      };
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare modifiers and other values for skills.
   * @param {object} [options={}]
   * @param {object} [options.rollData={}]     Roll data used to calculate bonuses.
   * @param {object} [options.originalSkills]  Original skills data for transformed actors.
   */
  prepareSkills({ rollData={}, originalSkills }={}) {
    const globalBonuses = this.bonuses.abilities;
    const globalCheckBonus = simplifyBonus(globalBonuses.check, rollData);
    const globalSkillBonus = simplifyBonus(globalBonuses.skill, rollData);
    for ( const [id, skillData] of Object.entries(this.skills) ) {
      this.prepareSkill(id, { skillData, rollData, originalSkills, globalBonuses, globalCheckBonus, globalSkillBonus });
    }
  }

  /* -------------------------------------------- */

  /**
   * Prepares data for a specific skill.
   * @param {string} skillId                     The id of the skill to prepare data for.
   * @param {object} [options]                   Additional options.
   * @param {SkillData} [options.skillData]      The base skill data for this skill.
   *                                             If undefined, `this.system.skill[skillId]` is used.
   * @param {object} [options.rollData]          RollData for this actor, used to evaluate dice terms in bonuses.
   *                                             If undefined, `this.getRollData()` is used.
   * @param {object} [options.originalSkills]    Original skills if actor is polymorphed.
   *                                             If undefined, the skills of the actor identified by
   *                                             `this.flags.dnd5e.originalActor` are used.
   * @param {object} [options.globalBonuses]     Global ability bonuses for this actor.
   *                                             If undefined, `this.system.bonuses.abilities` is used.
   * @param {number} [options.globalCheckBonus]  Global check bonus for this actor.
   *                                             If undefined, `globalBonuses.check` will be evaluated using `rollData`.
   * @param {number} [options.globalSkillBonus]  Global skill bonus for this actor.
   *                                             If undefined, `globalBonuses.skill` will be evaluated using `rollData`.
   * @param {string} [options.ability]           The ability to compute bonuses based on.
   *                                             If undefined, skillData.ability is used.
   * @returns {SkillData}
   */
  prepareSkill(skillId, {
    skillData, rollData, originalSkills, globalBonuses,
    globalCheckBonus, globalSkillBonus, ability
  }={}) {
    const flags = this.parent.flags.dnd5e ?? {};

    skillData ??= foundry.utils.deepClone(this.skills[skillId]);
    rollData ??= this.parent.getRollData();
    originalSkills ??= flags.originalActor ? game.actors?.get(flags.originalActor)?.system?.skills : null;
    globalBonuses ??= this.bonuses.abilities ?? {};
    globalCheckBonus ??= simplifyBonus(globalBonuses.check, rollData);
    globalSkillBonus ??= simplifyBonus(globalBonuses.skill, rollData);
    ability ??= skillData.ability;
    const abilityData = this.abilities[ability];
    skillData.ability = ability;
    const baseBonus = simplifyBonus(skillData.bonuses?.check, rollData);
    const originalSkill = originalSkills?.[skillId];
    if ( originalSkill?.value >= 1 ) {
      skillData.merged = true;
      skillData.value = originalSkill?.value;
    }

    // Compute modifier
    const checkBonusAbl = simplifyBonus(abilityData?.bonuses?.check, rollData);
    skillData.effectValue = skillData.value;
    skillData.bonus = baseBonus + globalCheckBonus + checkBonusAbl + globalSkillBonus;
    skillData.mod = abilityData?.mod ?? 0;
    const calculatedProf = this.calculateAbilityCheckProficiency(skillData.value, skillData.ability);
    skillData.prof = originalSkill?.prof?.multiplier > calculatedProf.multiplier
      ? originalSkill.prof.clone() : calculatedProf;
    skillData.value = skillData.proficient = skillData.prof.multiplier;
    skillData.total = skillData.mod + skillData.bonus;
    if ( Number.isNumeric(skillData.prof.term) ) skillData.total += skillData.prof.flat;

    // If we merged skills when transforming, take the highest bonus
    const difference = (originalSkill?.total ?? 0) - skillData.total;
    if ( originalSkill && (difference > 0) ) {
      skillData.bonuses.check = `${skillData.bonuses.check ?? ""} + ${difference}`;
      skillData.bonus += difference;
      skillData.total += difference;
    }

    // Compute passive bonus
    const passive = flags.observantFeat && CONFIG.DND5E.characterFlags.observantFeat.skills.includes(skillId) ? 5 : 0;
    const passiveBonus = simplifyBonus(skillData.bonuses?.passive, rollData);
    const advantageMode = AdvantageModeField.combineFields(this, [
      `abilities.${ability}.check.roll.mode`, `skills.${skillId}.roll.mode`
    ])?.mode ?? 0;
    skillData.passive = CONFIG.DND5E.skillPassive.base + skillData.mod + skillData.bonus + skillData.prof.flat
      + passive + passiveBonus + (advantageMode * CONFIG.DND5E.skillPassive.modifier);

    return skillData;
  }

  /* -------------------------------------------- */

  /**
   * Prepare tool checks. Mutates the values of system.tools.
   * @param {object} [options={}]
   * @param {object} [options.rollData={}]     Roll data used to calculate bonuses.
   */
  prepareTools({ rollData={} }={}) {
    const globalCheckBonus = simplifyBonus(this.bonuses.abilities.check, rollData);
    for ( const tool of Object.values(this.tools) ) {
      const ability = this.abilities[tool.ability];
      const baseBonus = simplifyBonus(tool.bonuses.check, rollData);
      const checkBonusAbl = simplifyBonus(ability?.bonuses?.check, rollData);
      tool.effectValue = tool.value;
      tool.bonus = baseBonus + globalCheckBonus + checkBonusAbl;
      tool.mod = ability?.mod ?? 0;
      tool.prof = this.calculateToolProficiency(tool.value, tool.ability);
      tool.total = tool.mod + tool.bonus;
      if ( Number.isNumeric(tool.prof.term) ) tool.total += tool.prof.flat;
      tool.value = tool.prof.multiplier;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  getRollData({ deterministic=false }={}) {
    const data = super.getRollData({ deterministic });
    data.classes = {};
    data.subclasses = {};
    for ( const [identifier, cls] of Object.entries(this.parent.classes) ) {
      data.classes[identifier] = {...cls.system};
      data.classes[identifier].hitDice = cls.system.hd.denomination; // Backwards compatibility
      if ( cls.subclass ) {
        data.classes[identifier].subclass = cls.subclass.system;
        data.subclasses[cls.subclass.identifier] = { levels: cls.system.levels };
      }
    }
    return data;
  }
}

/**
 * @typedef {RollConfigData} SkillData
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.check    Numeric or dice bonus to skill's check.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */

/**
 * @typedef {RollConfigData} ToolData
 * @property {number} value            Proficiency level creature has in this tool.
 * @property {object} bonuses          Bonuses for this tool.
 * @property {string} bonuses.check    Numeric or dice bonus to tool's check.
 */

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
    attack: new FormulaField({required: true}),
    damage: new FormulaField({required: true})
  }, schemaOptions);
}
