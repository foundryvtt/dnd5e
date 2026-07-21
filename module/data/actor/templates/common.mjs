import Proficiency from "../../../documents/actor/proficiency.mjs";
import AppliedRules from "../../../documents/applied-rules.mjs";
import { simplifyBonus } from "../../../utils.mjs";
import ActorDataModel from "../../abstract/actor-data-model.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import CurrencyTemplate from "../../shared/currency.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { ActorRollData } from "../../../documents/_types.mjs";
 * @import { CurrencyTemplateData } from "../../shared/_types.mjs";
 * @import { CommonTemplateData } from "./_types.mjs";
 */

/**
 * A template for all actors that share the common template.
 * @extends {ActorDataModel<CurrencyTemplate & CommonTemplateData>}
 * @mixes CurrencyTemplate
 * @mixes CommonTemplateData
 */
export default class CommonTemplate extends ActorDataModel.mixin(CurrencyTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      abilities: new MappingField(new SchemaField({
        value: new NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.AbilityScore",
          labelFormatter: "DND5E.ABILITY.Formatter.Score"
        }),
        proficient: new NumberField({
          required: true, integer: true, min: 0, max: 1, initial: 0, label: "DND5E.ProficiencyLevel",
          labelFormatter: "DND5E.ABILITY.Formatter.Save.Proficiency"
        }),
        max: new NumberField({
          required: true, integer: true, nullable: true, min: 0, initial: null, label: "DND5E.AbilityScoreMax",
          labelFormatter: "DND5E.ABILITY.Formatter.Maximum"
        }),
        bonuses: new SchemaField({}, { label: "DND5E.AbilityBonuses", persisted: false }),
        check: new RollConfigField({ ability: false }, {
          labelPrefix: "DND5E.ABILITY.FIELDS.abilities.element.check.roll.",
          labelFormatterPrefix: "DND5E.ABILITY.Formatter.Check."
        }),
        save: new RollConfigField({ ability: false }, {
          labelPrefix: "DND5E.ABILITY.FIELDS.abilities.element.save.roll.",
          labelFormatterPrefix: "DND5E.ABILITY.Formatter.Save."
        })
      }), {
        initialKeys: CONFIG.DND5E.abilities, initialValue: this._initialAbilityValue.bind(this),
        initialKeysOnly: true, label: "DND5E.Abilities", entryLabel: key => CONFIG.DND5E.abilities[key]?.label
      }),
      conditions: new MappingField(new NumberField({ integer: true, min: 1 }), { persisted: false })
    });
  }

  /* -------------------------------------------- */

  /**
   * Migrated paths for various bonuses.
   * @type {Array}
   */
  static #BONUS_FIELD_PATHS = [
    ["attributes.concentration.bonuses.save", "attributes.concentration.roll.bonus"],
    ["attributes.death.bonuses.save", "attributes.death.roll.bonus"],
    ["attributes.init.bonus", "attributes.init.roll.bonus"],
    ["bonuses.mwak.attack", "rolls.attack.mwak.bonus"],
    ["bonuses.mwak.damage", "rolls.damage.mwak.bonus"],
    ["bonuses.rwak.attack", "rolls.attack.rwak.bonus"],
    ["bonuses.rwak.damage", "rolls.damage.rwak.bonus"],
    ["bonuses.msak.attack", "rolls.attack.msak.bonus"],
    ["bonuses.msak.damage", "rolls.damage.msak.bonus"],
    ["bonuses.rsak.attack", "rolls.attack.rsak.bonus"],
    ["bonuses.rsak.damage", "rolls.damage.rsak.bonus"],
    ["bonuses.abilities.check", "rolls.ability.check.bonus"],
    ["bonuses.abilities.save", "rolls.ability.save.bonus"],
    ["bonuses.abilities.skill", "rolls.ability.skill.bonus"]
  ];

  /* -------------------------------------------- */

  /**
   * Migrated paths for abilities.
   * @type {Array}
   */
  static #ABILITY_BONUS_FIELD_PATHS = [
    ["bonuses.check", "check.roll.bonus"],
    ["bonuses.save", "save.roll.bonus"]
  ];

  /* -------------------------------------------- */

  /**
   * Migrated paths for skills & tools.
   * @type {Array}
   */
  static #SKILL_TOOL_BONUS_FIELD_PATHS = [
    ["bonuses.check", "check.roll.bonus"]
  ];

  /* -------------------------------------------- */

  /**
   * Populate the proper initial value for abilities.
   * @param {string} key       Key for which the initial data will be created.
   * @param {object} initial   The initial skill object created by SkillData.
   * @param {object} existing  Any existing mapping data.
   * @returns {object}         Initial ability object.
   * @private
   */
  static _initialAbilityValue(key, initial, existing) {
    const config = CONFIG.DND5E.abilities[key];
    if ( config ) {
      let defaultValue = config.defaults?.[this._systemType] ?? initial.value;
      if ( typeof defaultValue === "string" ) defaultValue = existing?.[defaultValue]?.value ?? initial.value;
      initial.value = defaultValue;
    }
    return initial;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    CommonTemplate.#migrateACData(source);
    CommonTemplate.#migrateBonusData(source);
    CommonTemplate.#migrateMovementData(source);
    return source;
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
   * Migrate roll bonus data from `bonuses` to `roll` as well as various other bonuses into roll fields.
   * @param {object} source       The candidate source data from which the model will be constructed.
   * @param {string[][]} [paths]  Field re-mappings.
   */
  static #migrateBonusData(source, paths) {
    for ( const [original, updated] of paths ?? CommonTemplate.#BONUS_FIELD_PATHS ) {
      if ( foundry.utils.hasProperty(source, updated) ) continue;
      const value = foundry.utils.getProperty(source, original);
      if ( !value ) continue;
      foundry.utils.setProperty(source, updated, value);
    }
    if ( paths ) return;
    for ( const value of Object.values(source.abilities ?? {}) ) {
      CommonTemplate.#migrateBonusData(value, CommonTemplate.#ABILITY_BONUS_FIELD_PATHS)
    }
    for ( const value of Object.values(source.skills ?? {}) ) {
      CommonTemplate.#migrateBonusData(value, CommonTemplate.#SKILL_TOOL_BONUS_FIELD_PATHS)
    }
    for ( const value of Object.values(source.tools ?? {}) ) {
      CommonTemplate.#migrateBonusData(value, CommonTemplate.#SKILL_TOOL_BONUS_FIELD_PATHS)
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the actor speed string to movement object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMovementData(source) {
    const original = source.attributes?.speed?.value ?? source.attributes?.speed;
    if ( (typeof original !== "string") || (source.attributes.movement?.walk !== undefined)
      || (source.attributes.movement?.speeds?.walk !== undefined) ) return;
    source.attributes.movement ??= {};
    source.attributes.movement.speeds ??= {};
    const s = original.split(" ");
    if ( s.length > 0 ) source.attributes.movement.speeds.walk = Number.isNumeric(s[0]) ? parseInt(s[0]) : 0;
  }

  /* -------------------------------------------- */
  /*  Data Shims                                  */
  /* -------------------------------------------- */

  /**
   * Apply shims for the old bonus locations.
   * @param {object} [data]       Base data model to shim.
   * @param {string[][]} [paths]  Field re-mappings.
   * @param {string} [prefix]     Path prefix for the deprecation warnings.
   */
  shimBonusData(data=this, paths=null, prefix="") {
    for ( const [original, updated] of paths ?? CommonTemplate.#BONUS_FIELD_PATHS ) {
      const parts = original.split(".");
      const key = parts.pop();
      const objectPath = parts.join(".");
      const container = foundry.utils.getProperty(data, objectPath);
      if ( !container ) continue;
      Object.defineProperty(container, key, {
        get: () => {
          foundry.utils.logCompatibilityWarning(`${prefix}${original} has moved to "${prefix}${updated}".`, {
            since: "DnD5e 6.0", until: "DnD5e 7.0", once: true
          });
          return foundry.utils.getProperty(data, updated) ?? "";
        }
      });
    }
    if ( paths ) return;
    for ( const [key, value] of Object.entries(this.abilities ?? {}) ) {
      this.shimBonusData(value, CommonTemplate.#ABILITY_BONUS_FIELD_PATHS, `abilities.${key}.`);
    }
    for ( const [key, value] of Object.entries(this.skills ?? {}) ) {
      this.shimBonusData(value, CommonTemplate.#SKILL_TOOL_BONUS_FIELD_PATHS, `skills.${key}.`);
    }
    for ( const [key, value] of Object.entries(this.tools ?? {}) ) {
      this.shimBonusData(value, CommonTemplate.#SKILL_TOOL_BONUS_FIELD_PATHS, `tools.${key}.`);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare modifiers and other values for abilities.
   * @param {object} [options={}]
   * @param {ActorRollData} [options.rollData={}]  Roll data used to calculate bonuses.
   * @param {object} [options.originalSaves]       Original ability data for transformed actors.
   */
  prepareAbilities({ rollData={}, originalSaves }={}) {
    const flags = this.parent.flags.dnd5e ?? {};
    const { prof = 0, ac } = this.attributes ?? {};
    Object.values(this.abilities).forEach(a => a.mod = Math.floor((a.value - 10) / 2));
    const checkBonus = simplifyBonus(this.rolls?.ability?.check?.bonus, rollData);
    const saveBonus = simplifyBonus(this.rolls?.ability?.save?.bonus, rollData);
    const dcBonus = simplifyBonus(this.bonuses?.spell?.dc, rollData);
    for ( const [id, abl] of Object.entries(this.abilities) ) {
      if ( flags.diamondSoul ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
      abl.proficient = Math.max(abl.proficient, this.rolls?.ability?.save?.proficiency ?? -Infinity);
      const originalAbility = originalSaves?.[id];
      if ( originalAbility?.proficient ) {
        abl.merged = true;
        abl.proficient = originalAbility?.proficient;
      }

      const calculatedProf = this.calculateAbilityCheckProficiency(0, id);
      abl.checkProf = originalAbility?.checkProf?.multiplier > calculatedProf.multiplier
        ? originalAbility.checkProf.clone() : calculatedProf;
      abl.saveProf = abl.merged ? originalAbility.saveProf.clone() : new Proficiency(prof, abl.proficient);

      rollData = { ...rollData };
      rollData.roll = { ability: id, proficient: abl.checkProf.multiplier >= 1, type: "ability" };

      const checkBonusAbl = simplifyBonus(abl.check?.roll?.bonus, rollData);
      const checkBonusRules = simplifyBonus(
        AppliedRules.collect("check:bonus", this.parent).filterWith(rollData).toFormula(), rollData
      );
      abl.checkBonus = checkBonusAbl + checkBonusRules + checkBonus;

      const saveBonusAbl = simplifyBonus(abl.save?.roll?.bonus, rollData);
      const cover = id === "dex" ? Math.max(ac?.cover ?? 0, this.parent.coverBonus) : 0;
      rollData.roll.proficient = abl.saveProf.multiplier >= 1;
      const saveBonusRules = simplifyBonus(
        AppliedRules.collect("save:bonus", this.parent).filterWith(rollData).toFormula(), rollData
      );
      abl.saveBonus = saveBonusAbl + saveBonusRules + saveBonus + cover;

      abl.save.value = abl.mod + abl.saveBonus;
      if ( Number.isNumeric(abl.saveProf.term) ) abl.save.value += abl.saveProf.flat;
      abl.attack = abl.mod + prof;
      abl.dc = 8 + abl.mod + prof + dcBonus;

      if ( !Number.isFinite(abl.max) ) abl.max = CONFIG.DND5E.maxAbilityScore;

      // Adjust rolling mode
      const isPhysicalAbility = CONFIG.DND5E.abilities[id]?.type === "physical";
      if ( this.parent.hasConditionEffect("abilityCheckDisadvantage")
        || (isPhysicalAbility && this.parent.hasConditionEffect("physicalCheckDisadvantage")) ) {
        AdvantageModeField.setMode(this, `abilities.${id}.check.roll.mode`, -1);
      }
      if ( (id === "dex") && this.parent.hasConditionEffect("dexteritySaveAdvantage") ) {
        AdvantageModeField.setMode(this, `abilities.${id}.save.roll.mode`, 1);
      }
      if ( this.parent.hasConditionEffect("abilitySaveDisadvantage")
        || (isPhysicalAbility && this.parent.hasConditionEffect("physicalSaveDisadvantage"))
        || ((id === "dex") && this.parent.hasConditionEffect("dexteritySaveDisadvantage")) ) {
        AdvantageModeField.setMode(this, `abilities.${id}.save.roll.mode`, -1);
      }
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Create the proficiency object for an ability, skill, or tool, taking remarkable athlete and Jack of All Trades
   * into account.
   * @param {number} multiplier       Multiplier stored on the actor.
   * @param {string} ability          Ability associated with this proficiency.
   * @param {object} [options={}]
   * @param {string} [options.skill]  Skill associated with this proficiency.
   * @param {string} [options.tool]   Tool associated with this proficiency.
   * @returns {Proficiency}
   */
  calculateAbilityCheckProficiency(multiplier, ability, options={}) {
    let roundDown = true;
    multiplier = Math.max(multiplier, this.rolls?.ability?.check?.proficiency ?? -Infinity);
    if ( options.skill ) multiplier = Math.max(multiplier, this.rolls?.ability?.skill?.proficiency ?? -Infinity);
    if ( (multiplier < 1) && ((dnd5e.settings.rulesVersion === "legacy") || options.skill) ) {
      if ( this.parent._isRemarkableAthlete(ability) ) {
        multiplier = .5;
        roundDown = false;
      }
      else if ( this.parent.flags.dnd5e?.jackOfAllTrades ) multiplier = .5;
    }
    return new Proficiency(this.attributes.prof, multiplier, roundDown);
  }

  /* -------------------------------------------- */

  /**
   * Calculate proficiency, applying specific logic for tools.
   * @param {number} multiplier       Multiplier stored on the actor.
   * @param {string} ability          Ability associated with this proficiency.
   * @param {object} [options={}]
   * @param {string} [options.skill]  Skill associated with this proficiency.
   * @param {string} [options.tool]   Tool associated with this proficiency.
   * @returns {Proficiency}
   */
  calculateToolProficiency(multiplier, ability, options={}) {
    multiplier = Math.max(multiplier, this.rolls?.ability?.tool?.proficiency ?? -Infinity);
    if ( (multiplier === 1) && this.parent.flags.dnd5e?.toolExpertise ) {
      return new Proficiency(this.attributes.prof, 2, true);
    }
    return this.calculateAbilityCheckProficiency(multiplier, ability, options);
  }

  /* -------------------------------------------- */

  /**
   * Calculate proficiency for a given actor using either a skill, a tool, or both.
   * @param {Actor5e} actor           The actor.
   * @param {string} abilityId        The ability used with the check.
   * @param {object} [options]
   * @param {string} [options.skill]  The skill.
   * @param {string} [options.tool]   The tool.
   * @returns {Proficiency|null}
   */
  static calculateSkillToolProficiency(actor, abilityId, options={}) {
    if ( !actor ) return null;
    const skill = actor.system.skills?.[options.skill];
    const tool = actor.system.tools?.[options.tool];
    const multiplier = Math.max(skill?.effectValue ?? 0, tool?.effectValue ?? 0);
    const calc = options.tool ? actor.system.calculateToolProficiency : actor.system.calculateAbilityCheckProficiency;
    return calc.call(actor.system, multiplier, abilityId, options);
  }
}
