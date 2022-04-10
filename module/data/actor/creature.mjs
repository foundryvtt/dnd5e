import { FormulaField, MappingField } from "../fields.mjs";
import * as common from "./common.mjs";

/**
 * Data definition for creature data template used by Characters & NPCs.
 *
 * @property {AttributeData} attributes          Extended attributes with senses and spellcasting.
 * @property {DetailsData} details               Extended details with race and alignment.
 * @property {Object<string, SkillData>} skills  Creature's skills.
 * @property {TraitsData} traits                 Extended traits with languages.
 * @property {Object<string, SpellData>} spells  Creature's spell levels with slots.
 * @property {BonusesData} bonuses               Global bonuses to various rolls.
 */
export class CreatureData extends common.CommonData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      attributes: new foundry.data.fields.EmbeddedDataField(AttributeData, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.EmbeddedDataField(DetailsData, {label: "DND5E.Details"}),
      skills: new MappingField(new foundry.data.fields.EmbeddedDataField(SkillData), {
        initialKeys: CONFIG.DND5E.skills, label: "DND5E.Skills"
      }),
      traits: new foundry.data.fields.EmbeddedDataField(TraitsData, {label: "DND5E.Traits"}),
      spells: new MappingField(new foundry.data.fields.EmbeddedDataField(SpellData), {
        initialKeys: this._spellLevels, label: "DND5E.SpellLevels"
      }),
      bonuses: new foundry.data.fields.EmbeddedDataField(BonusesData, {label: "DND5E.Bonuses"})
    };
  }

  /**
   * Helper for building the default list of spell levels.
   * @type {string[]}
   * @private
   */
  static get _spellLevels() {
    const levels = Object.keys(CONFIG.DND5E.spellLevels).filter(a => a !== "0").map(l => `spell${l}`);
    return [...levels, "pact"];
  }
}

/**
 * An embedded data structure for extra attribute data used by creatures.
 * @see CreatureData
 *
 * @property {object} attunement          Attunement data.
 * @property {number} attunement.max      Maximum number of attuned items.
 * @property {object} senses              Creature's senses.
 * @property {number} senses.darkvision   Creature's darkvision range.
 * @property {number} senses.blindsight   Creature's blindsight range.
 * @property {number} senses.tremorsense  Creature's tremorsense range.
 * @property {number} senses.truesight    Creature's truesight range.
 * @property {string} senses.units        Distance units used to measure senses.
 * @property {string} senses.special      Description of any special senses or restrictions.
 * @property {string} spellcasting        Primary spellcasting ability.
 */
export class AttributeData extends common.AttributeData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      attunement: new foundry.data.fields.SchemaField({
        max: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 3, label: "DND5E.AttunementMax"
        })
      }, {label: "DND5E.Attunement"}),
      senses: new foundry.data.fields.SchemaField({
        darkvision: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseDarkvision"
        }),
        blindsight: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseBlindsight"
        }),
        tremorsense: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseTremorsense"
        }),
        truesight: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SenseTruesight"
        }),
        units: new foundry.data.fields.StringField({required: true, initial: "ft", label: "DND5E.SenseUnits"}),
        special: new foundry.data.fields.StringField({required: true, label: "DND5E.SenseSpecial"})
      }, {label: "DND5E.Senses"}),
      spellcasting: new foundry.data.fields.StringField({
        required: true, blank: true, initial: "int", label: "DND5E.SpellAbility"
      })
    };
  }
}

/**
 * An embedded data structure for extra details data used by creatures.
 * @see CreatureData
 *
 * @property {string} alignment  Creature's alignment.
 * @property {string} race       Creature's race.
 */
export class DetailsData extends common.DetailsData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      alignment: new foundry.data.fields.StringField({required: true, label: "DND5E.Alignment"}),
      race: new foundry.data.fields.StringField({required: true, label: "DND5E.Race"})
    };
  }
}

/**
 * An embedded data structure for individual skill data.
 * @see CreatureData
 *
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {string} ability          Default ability used for this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.check    Numeric or dice bonus to skill's check.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */
export class SkillData extends foundry.abstract.DataModel {
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

/**
 * An embedded data structure for extra traits data used by creatures.
 * @see CreatureData
 *
 * @property {object} languages          Languages known by this creature.
 * @property {string[]} languages.value  Currently selected languages.
 * @property {string} languages.custom   Semicolon-separated list of custom languages.
 */
export class TraitsData extends common.TraitsData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      languages: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(
          new foundry.data.fields.StringField({blank: false}), {label: "DND5E.TraitsChosen"}
        ),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.Languages"})
    };
  }
}

/**
 * An embedded data structure for individual spell levels.
 * @see CreatureData
 *
 * @property {number} value     Number of unused spell slots at this level.
 * @property {number} override  Manual override of total spell slot count for this level.
 */
export class SpellData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.SpellProgAvailable"
      }),
      override: new foundry.data.fields.NumberField({required: true, integer: true, min: 0, label: "DND5E.SpellProgOverride"})
    };
  }
}

/**
 * An embedded data structure for global creature bonuses.
 * @see CreatureData
 *
 * @property {AttackBonusesData} mwak  Bonuses to melee weapon attacks.
 * @property {AttackBonusesData} rwak  Bonuses to ranged weapon attacks.
 * @property {AttackBonusesData} msak  Bonuses to melee spell attacks.
 * @property {AttackBonusesData} rsak  Bonuses to ranged spell attacks.
 * @property {object} abilities        Bonuses to ability scores.
 * @property {string} abilities.check  Numeric or dice bonus to ability checks.
 * @property {string} abilities.save   Numeric or dice bonus to ability saves.
 * @property {string} abilities.skill  Numeric or dice bonus to skill checks.
 * @property {object} spell            Bonuses to spells.
 * @property {string} spell.dc         Numeric bonus to spellcasting DC.
 */
export class BonusesData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      mwak: new foundry.data.fields.EmbeddedDataField(AttackBonusesData, {label: "DND5E.BonusMWAttack"}),
      rwak: new foundry.data.fields.EmbeddedDataField(AttackBonusesData, {label: "DND5E.BonusRWAttack"}),
      msak: new foundry.data.fields.EmbeddedDataField(AttackBonusesData, {label: "DND5E.BonusMSAttack"}),
      rsak: new foundry.data.fields.EmbeddedDataField(AttackBonusesData, {label: "DND5E.BonusRSAttack"}),
      abilities: new foundry.data.fields.SchemaField({
        check: new FormulaField({required: true, label: "DND5E.BonusAbilityCheck"}),
        save: new FormulaField({required: true, label: "DND5E.BonusAbilitySave"}),
        skill: new FormulaField({required: true, label: "DND5E.BonusAbilitySkill"})
      }, {label: "DND5E.BonusAbility"}),
      spell: new foundry.data.fields.SchemaField({
        dc: new FormulaField({required: true, deterministic: true, label: "DND5E.BonusSpellDC"})
      }, {label: "DND5E.BonusSpell"})
    };
  }
}

/**
 * An embedded data structure for global attack bonuses.
 * @see BonusesData
 *
 * @property {string} attack  Numeric or dice bonus to attack rolls.
 * @property {string} damage  Numeric or dice bonus to damage rolls.
 */
export class AttackBonusesData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      attack: new FormulaField({required: true, label: "DND5E.BonusAttack"}),
      damage: new FormulaField({required: true, label: "DND5E.BonusDamage"})
    };
  }
}
