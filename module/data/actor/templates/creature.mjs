import * as Trait from "../../../documents/actor/trait.mjs";
import AppliedRules from "../../../documents/applied-rules.mjs";
import { simplifyBonus } from "../../../utils.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import D20RollModificationField from "../../shared/d20-roll-modification-field.mjs";
import DamageRollModificationField from "../../shared/damage-roll-modification-field.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";
import SensesField from "../../shared/senses-field.mjs";
import CommonTemplate from "./common.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { ActorRollData } from "../../../documents/_types.mjs";
 * @import { CreatureTemplateData, SkillData } from "./_types.mjs";
 */

/**
 * A template for all actors that are creatures.
 * @extends {CommonTemplate<CreatureTemplateData>}
 * @mixes CreatureTemplateData
 */
export default class CreatureTemplate extends CommonTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      bonuses: new SchemaField({
        spell: new SchemaField({
          dc: new FormulaField({ required: true, deterministic: true })
        })
      }),
      rolls: new SchemaField({
        ability: new SchemaField({
          check: new D20RollModificationField({
            proficiency: new NumberField({
              choices: [0, 0.5, 1, 2], initial: 0, persisted: false,
              label: "DND5E.ROLL.FIELDS.rolls.ability.check.proficiency.label"
            })
          }, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.ability.check." }),
          save: new D20RollModificationField({
            proficiency: new NumberField({
              choices: [0, 1], initial: 0, persisted: false,
              label: "DND5E.ROLL.FIELDS.rolls.ability.save.proficiency.label"
            })
          }, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.ability.save." }),
          skill: new D20RollModificationField({
            proficiency: new NumberField({
              choices: [0, 0.5, 1, 2], initial: 0, persisted: false,
              label: "DND5E.ROLL.FIELDS.rolls.ability.skill.proficiency.label"
            })
          }, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.ability.skill." }),
          tool: new D20RollModificationField({
            proficiency: new NumberField({
              choices: [0, 0.5, 1, 2], initial: 0, persisted: false,
              label: "DND5E.ROLL.FIELDS.rolls.ability.tool.proficiency.label"
            })
          }, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.ability.tool." })
        }, { required: false }),
        attack: new D20RollModificationField({
          msak: new D20RollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.attack.msak." }),
          mwak: new D20RollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.attack.mwak." }),
          rsak: new D20RollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.attack.rsak." }),
          rwak: new D20RollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.attack.rwak." })
        }, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.attack." }),
        damage: new SchemaField({
          msak: new DamageRollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.damage.msak." }),
          mwak: new DamageRollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.damage.mwak." }),
          rsak: new DamageRollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.damage.rsak." }),
          rwak: new DamageRollModificationField({}, { labelPrefix: "DND5E.ROLL.FIELDS.rolls.damage.rwak." })
        }, { required: false })
      }),
      skills: new MappingField(new RollConfigField({
        ability: "dex",
        bonuses: new SchemaField({
          passive: new FormulaField({
            required: true, label: "DND5E.SkillBonusPassive", labelFormatter: "DND5E.SKILL.Formatter.PassiveBonus"
          })
        }, { label: "DND5E.SkillBonuses" }),
        value: new NumberField({
          required: true, nullable: false, min: 0, max: 2, step: 0.5, initial: 0, label: "DND5E.ProficiencyLevel",
          labelFormatter: "DND5E.SKILL.Formatter.Proficiency"
        })
      }, { labelPrefix: "DND5E.SKILL.FIELDS.skills.element.roll." }), {
        initialKeys: CONFIG.DND5E.skills, initialValue: this._initialSkillValue,
        initialKeysOnly: true, label: "DND5E.Skills", entryLabel: key => CONFIG.DND5E.skills[key]?.label
      }),
      tools: new MappingField(new RollConfigField({
        ability: "int",
        bonuses: new SchemaField({}, { persisted: false }),
        value: new NumberField({
          required: true, nullable: false, min: 0, max: 2, step: 0.5, initial: 0, label: "DND5E.ProficiencyLevel",
          labelFormatter: "DND5E.TOOL.Formatter.Proficiency"
        })
      }, { labelPrefix: "DND5E.TOOL.FIELDS.tools.element.roll." }), {
        entryLabel: key => Trait.keyLabel(key, { trait: "tool" })
      }),
      spells: new MappingField(new SchemaField({
        value: new NumberField({
          nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellProgAvailable"
        }),
        override: new NumberField({
          integer: true, min: 0, initial: null, label: "DND5E.SpellProgOverride"
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
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether this Actor type represents a creature.
   * @returns {boolean}
   */
  get isCreature() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    CreatureTemplate.#migrateSensesData(source);
    CreatureTemplate.#migrateToolData(source);
    return source;
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor traits.senses string to attributes.senses object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSensesData(source) {
    const original = source.traits?.senses;
    if ( (original === undefined) || (typeof original !== "string") ) {
      SensesField._migrate(source.attributes?.senses);
      return;
    }

    source.attributes ??= {};
    source.attributes.senses ??= {};
    source.attributes.senses.ranges ??= {};

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
        source.attributes.senses.ranges[type] = Number(match[2]).toNearest(0.5);
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
   * @param {ActorRollData} [options.rollData={}]  Roll data used to calculate bonuses.
   * @param {object} [options.originalSkills]      Original skills data for transformed actors.
   */
  prepareSkills({ rollData={}, originalSkills }={}) {
    const globalBonuses = this.rolls.ability;
    const globalCheckBonus = simplifyBonus(globalBonuses?.check?.bonus, rollData);
    const globalSkillBonus = simplifyBonus(globalBonuses?.skill?.bonus, rollData);
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
   * @param {ActorRollData} [options.rollData]   RollData for this actor, used to evaluate dice terms in bonuses.
   *                                             If undefined, `this.getRollData()` is used.
   * @param {object} [options.originalSkills]    Original skills if actor is polymorphed.
   *                                             If undefined, the skills of the actor identified by
   *                                             `this.flags.dnd5e.originalActor` are used.
   * @param {object} [options.globalBonuses]     Global ability bonuses for this actor.
   *                                             If undefined, `this.system.rolls.ability` is used.
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
    globalBonuses ??= this.rolls.ability ?? {};
    globalCheckBonus ??= simplifyBonus(globalBonuses.check?.bonus, rollData);
    globalSkillBonus ??= simplifyBonus(globalBonuses.skill?.bonus, rollData);
    ability ??= skillData.ability;
    const abilityData = this.abilities[ability];
    skillData.ability = ability;
    const originalSkill = originalSkills?.[skillId];
    if ( originalSkill?.value >= 1 ) {
      skillData.merged = true;
      skillData.value = originalSkill?.value;
    }

    // Compute proficiency
    const calculatedProf = this.calculateAbilityCheckProficiency(
      skillData.value, skillData.ability, { skill: skillId }
    );
    skillData.prof = originalSkill?.prof?.multiplier > calculatedProf.multiplier
      ? originalSkill.prof.clone() : calculatedProf;

    // Complete roll data
    rollData = { ...rollData };
    rollData.roll = { ability, proficient: skillData.prof.multiplier >= 1, skill: skillId, type: "skill" };

    // Compute modifier
    const checkBonusAbl = simplifyBonus(abilityData?.check?.roll?.bonus, rollData);
    skillData.effectValue = skillData.value;
    const baseBonus = simplifyBonus(skillData.roll?.bonus, rollData);
    const ruleBonus = simplifyBonus(
      AppliedRules.collect("check:bonus", this.parent).filterWith(rollData).toFormula(), rollData
    );
    skillData.bonus = baseBonus + globalCheckBonus + checkBonusAbl + globalSkillBonus + ruleBonus;
    skillData.mod = abilityData?.mod ?? 0;
    skillData.value = skillData.proficient = skillData.prof.multiplier;
    skillData.total = skillData.mod + skillData.bonus;
    if ( Number.isNumeric(skillData.prof.term) ) skillData.total += skillData.prof.flat;

    // If we merged skills when transforming, take the highest bonus
    const difference = (originalSkill?.total ?? 0) - skillData.total;
    if ( originalSkill && (difference > 0) ) {
      skillData.roll.bonus = `${skillData.roll.bonus ?? ""} + ${difference}`;
      skillData.bonus += difference;
      skillData.total += difference;
    }

    const isLegacy = dnd5e.settings.rulesVersion === "legacy";
    if ( flags.remarkableAthlete
      && CONFIG.DND5E.characterFlags.remarkableAthlete.skills.includes(skillId) && !isLegacy ) {
      AdvantageModeField.setMode(this, `skills.${skillId}.roll.mode`, 1);
    }

    // Compute passive bonus
    const passive = flags.observantFeat && CONFIG.DND5E.characterFlags.observantFeat.skills.includes(skillId) ? 5 : 0;
    const passiveBonus = simplifyBonus(skillData.bonuses?.passive, rollData);
    const advantageMode = AdvantageModeField.combineFields(this, [
      `abilities.${ability}.check.roll.mode`, `skills.${skillId}.roll.mode`,
      "rolls.ability.check.mode", "rolls.ability.skill.mode"
    ], AppliedRules.collect("check:advantage", this.parent).filterWith(rollData).toAdvantageCounts())?.mode ?? 0;
    skillData.passive = CONFIG.DND5E.skillPassive.base + skillData.mod + skillData.bonus + skillData.prof.flat
      + passive + passiveBonus + (advantageMode * CONFIG.DND5E.skillPassive.modifier);

    return skillData;
  }

  /* -------------------------------------------- */

  /**
   * Prepare tool checks. Mutates the values of system.tools.
   * @param {object} [options={}]
   * @param {ActorRollData} [options.rollData={}]  Roll data used to calculate bonuses.
   */
  prepareTools({ rollData={} }={}) {
    const globalCheckBonus = simplifyBonus(this.rolls.ability?.check?.bonus, rollData);
    const globalToolBonus = simplifyBonus(this.rolls.ability?.tool?.bonus, rollData);
    for ( const [id, tool] of Object.entries(this.tools) ) {
      const ability = this.abilities[tool.ability];
      tool.prof = this.calculateToolProficiency(tool.value, tool.ability);

      // Complete roll data
      rollData = { ...rollData };
      rollData.roll = { ability: tool.ability, proficient: tool.prof.multiplier >= 1, tool: id, type: "tool" };

      const baseBonus = simplifyBonus(tool.roll.bonus, rollData);
      const checkBonusAbl = simplifyBonus(ability?.check?.roll?.bonus, rollData);
      const ruleBonus = simplifyBonus(
        AppliedRules.collect("check:bonus", this.parent).filterWith(rollData).toFormula(), rollData
      );
      tool.effectValue = tool.value;
      tool.bonus = baseBonus + globalCheckBonus + globalToolBonus + checkBonusAbl + ruleBonus;
      tool.mod = ability?.mod ?? 0;
      tool.total = tool.mod + tool.bonus;
      if ( Number.isNumeric(tool.prof.term) ) tool.total += tool.prof.flat;
      tool.value = tool.prof.multiplier;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  getRollData(options={}) {
    const data = super.getRollData(options);
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
