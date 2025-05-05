import Proficiency from "../../../documents/actor/proficiency.mjs";
import { simplifyBonus } from "../../../utils.mjs";
import ActorDataModel from "../../abstract/actor-data-model.mjs";
import AdvantageModeField from "../../fields/advantage-mode-field.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";
import CurrencyTemplate from "../../shared/currency.mjs";
import RollConfigField from "../../shared/roll-config-field.mjs";

const { NumberField, SchemaField } = foundry.data.fields;

/**
 * @typedef {object} AbilityData
 * @property {number} value          Ability score.
 * @property {number} proficient     Proficiency value for saves.
 * @property {number} max            Maximum possible score for the ability.
 * @property {object} bonuses        Bonuses that modify ability checks and saves.
 * @property {string} bonuses.check  Numeric or dice bonus to ability checks.
 * @property {string} bonuses.save   Numeric or dice bonus to ability saving throws.
 * @property {RollConfigData} check    Properties related to ability checks.
 * @property {RollConfigData} save     Properties related to saving throws.
 */

/**
 * A template for all actors that share the common template.
 *
 * @property {Object<string, AbilityData>} abilities  Actor's abilities.
 * @mixin
 */
export default class CommonTemplate extends ActorDataModel.mixin(CurrencyTemplate) {

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      abilities: new MappingField(new SchemaField({
        value: new NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 10, label: "DND5E.AbilityScore"
        }),
        proficient: new NumberField({
          required: true, integer: true, min: 0, max: 1, initial: 0, label: "DND5E.ProficiencyLevel"
        }),
        max: new NumberField({
          required: true, integer: true, nullable: true, min: 0, initial: null, label: "DND5E.AbilityScoreMax"
        }),
        bonuses: new SchemaField({
          check: new FormulaField({ required: true, label: "DND5E.AbilityCheckBonus" }),
          save: new FormulaField({ required: true, label: "DND5E.SaveBonus" })
        }, { label: "DND5E.AbilityBonuses" }),
        check: new RollConfigField({ ability: false }),
        save: new RollConfigField({ ability: false })
      }), {
        initialKeys: CONFIG.DND5E.abilities, initialValue: this._initialAbilityValue.bind(this),
        initialKeysOnly: true, label: "DND5E.Abilities"
      })
    });
  }

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

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare modifiers and other values for abilities.
   * @param {object} [options={}]
   * @param {object} [options.rollData={}]    Roll data used to calculate bonuses.
   * @param {object} [options.originalSaves]  Original ability data for transformed actors.
   */
  prepareAbilities({ rollData={}, originalSaves }={}) {
    const flags = this.parent.flags.dnd5e ?? {};
    const { prof = 0, ac } = this.attributes ?? {};
    Object.values(this.abilities).forEach(a => a.mod = Math.floor((a.value - 10) / 2));
    const checkBonus = simplifyBonus(this.bonuses?.abilities?.check, rollData);
    const saveBonus = simplifyBonus(this.bonuses?.abilities?.save, rollData);
    const dcBonus = simplifyBonus(this.bonuses?.spell?.dc, rollData);
    for ( const [id, abl] of Object.entries(this.abilities) ) {
      if ( flags.diamondSoul ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
      const originalAbility = originalSaves?.[id];
      if ( originalAbility?.proficient ) {
        abl.merged = true;
        abl.proficient = originalAbility?.proficient;
      }

      const calculatedProf = this.calculateAbilityCheckProficiency(0, id);
      abl.checkProf = originalAbility?.checkProf?.multiplier > calculatedProf.multiplier
        ? originalAbility.checkProf.clone() : calculatedProf;
      const saveBonusAbl = simplifyBonus(abl.bonuses?.save, rollData);

      const cover = id === "dex" ? Math.max(ac?.cover ?? 0, this.parent.coverBonus) : 0;
      abl.saveBonus = saveBonusAbl + saveBonus + cover;

      abl.saveProf = abl.merged ? originalAbility.saveProf.clone() : new Proficiency(prof, abl.proficient);
      const checkBonusAbl = simplifyBonus(abl.bonuses?.check, rollData);
      abl.checkBonus = checkBonusAbl + checkBonus;

      abl.save.value = abl.mod + abl.saveBonus;
      if ( Number.isNumeric(abl.saveProf.term) ) abl.save.value += abl.saveProf.flat;
      abl.attack = abl.mod + prof;
      abl.dc = 8 + abl.mod + prof + dcBonus;

      if ( !Number.isFinite(abl.max) ) abl.max = CONFIG.DND5E.maxAbilityScore;

      // Adjust rolling mode
      if ( this.parent.hasConditionEffect("abilityCheckDisadvantage") ) {
        AdvantageModeField.setMode(this, `abilities.${id}.check.roll.mode`, -1);
      }
      if ( this.parent.hasConditionEffect("abilitySaveDisadvantage")
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
   * @param {number} multiplier  Multiplier stored on the actor.
   * @param {string} ability     Ability associated with this proficiency.
   * @returns {Proficiency}
   */
  calculateAbilityCheckProficiency(multiplier, ability) {
    let roundDown = true;
    if ( multiplier < 1 ) {
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
   * @param {number} multiplier  Multiplier stored on the actor.
   * @param {string} ability     Ability associated with this proficiency.
   * @returns {Proficiency}
   */
  calculateToolProficiency(multiplier, ability) {
    if ( (multiplier === 1) && this.parent.flags.dnd5e?.toolExpertise ) {
      return new Proficiency(this.attributes.prof, 2, true);
    }
    return this.calculateAbilityCheckProficiency(multiplier, ability);
  }

  /* -------------------------------------------- */

  /**
   * Calculate proficiency for a given actor using either a skill, a tool, or both.
   * @param {Actpr5e} actor           The actor.
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
    return calc.call(actor.system, multiplier, abilityId);
  }
}
