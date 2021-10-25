import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { mergeObject } from "/common/utils/helpers.mjs";
import { DETERMINISTIC_FORMULA_FIELD, FORMULA_FIELD, mappingField } from "../fields.mjs";
import { defaultData } from "./base.mjs";
import * as common from "./common.mjs";


/**
 * Data definition for creature data template used by Characters & NPCs.
 * @extends common.CommonData
 *
 * @property {AttributeData} attributes          Extended attributes with senses and spellcasting.
 * @property {DetailsData} details               Extended details with race and alignment.
 * @property {object<string, SkillData>} skills  Creature's skills.
 * @property {TraitsData} traits                 Extended traits with languages.
 * @property {object<string, SpellData>} spells  Creature's spell levels with slots.
 * @property {BonusesData} bonuses               Global bonuses to various rolls.
 */
export class CreatureData extends common.CommonData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      attributes: { type: AttributeData, default: defaultData("templates.creature.attributes") },
      details: { type: DetailsData, default: defaultData("templates.creature.details") },
      skills: mappingField({
        type: SkillData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.skills")
      }),
      traits: { type: TraitsData, default: defaultData("templates.creature.traits") },
      spells: mappingField({
        type: SpellData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.spells")
      }),
      bonuses: {
        type: BonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.bonuses")
      }
    });
  }
}

/* -------------------------------------------- */
/*  Attributes                                  */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra attribute data used by creatures.
 * @extends common.AttributeData
 * @see CreatureData
 *
 * @property {SensesData} senses    Creature's senses.
 * @property {string} spellcasting  Primary spellcasting ability.
 */
export class AttributeData extends common.AttributeData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      senses: {
        type: SensesData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.attributes.senses")
      },
      spellcasting: fields.field(fields.BLANK_STRING, { default: "int" })
    });
  }
}

/**
 * An embedded data structure for representing a creature's senses.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} darkvision   Creature's darkvision range.
 * @property {number} blindsight   Creature's blindsight range.
 * @property {number} tremorsense  Creature's tremorsense range.
 * @property {number} truesight    Creature's truesight range.
 * @property {string} units        Distance units used to measure senses.
 * @property {string} special      Description of any special senses or restrictions.
 */
export class SensesData extends DocumentData {
  static defineSchema() {
    return {
      darkvision: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      blindsight: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      tremorsense: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      truesight: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      units: fields.field(fields.REQUIRED_STRING, { default: "ft" }),
      special: fields.BLANK_STRING
    };
  }
}

/* -------------------------------------------- */
/*  Details                                     */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra details data used by creatures.
 * @extends common.DetailsData
 * @see CreatureData
 *
 * @property {string} alignment  Creature's alignment.
 * @property {string} race       Creature's race.
 */
export class DetailsData extends common.DetailsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      alignment: fields.BLANK_STRING,
      race: fields.BLANK_STRING
    });
  }
}

/* -------------------------------------------- */
/*  Skills                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for individual skill data.
 * @extends DocumentData
 * @see CreatureData
 *
 * @property {number} value              Proficiency level creature has in this skill.
 * @property {string} ability            Default ability used for this skill.
 * @property {SkillBonusesData} bonuses  Bonuses for this skill.
 */
export class SkillData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NUMERIC_FIELD, fields.REQUIRED_NUMBER),
      ability: fields.field(fields.REQUIRED_STRING, { default: "dex" }),
      bonuses: {
        type: SkillBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.skills.acr.bonuses")
      }
    };
  }
}

/**
 * An embedded data structure for bonuses granted to individual skills.
 * @extends DocumentData
 * @see SkillData
 *
 * @property {string} check    Numeric or dice bonus to skill's check.
 * @property {string} passive  Numeric bonus to skill's passive check.
 */
export class SkillBonusesData extends DocumentData {
  static defineSchema() {
    return {
      check: FORMULA_FIELD,
      passive: DETERMINISTIC_FORMULA_FIELD
    };
  }
}

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra traits data used by creatures.
 * @extends common.TraitsData
 * @see CreatureData
 *
 * @property {common.SimpleTraitData} languages  Languages known by this creature.
 */
export class TraitsData extends common.TraitsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      languages: {
        type: common.SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("templates.creature.traits.languages")
      }
    });
  }
}

/* -------------------------------------------- */
/*  Spells                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for individual spell levels.
 * @extends DocumentData
 * @see CreatureData
 *
 * @property {number} value     Number of unused spell slots at this level.
 * @property {number} override  Manual override of total spell slot count for this level.
 */
export class SpellData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      override: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null })
    };
  }
}

/* -------------------------------------------- */
/*  Bonuses                                     */
/* -------------------------------------------- */

/**
 * An embedded data structure for global creature bonuses.
 * @extends DocumentData
 * @see CreatureData
 *
 * @property {AttackBonusesData} mwak        Bonuses to melee weapon attacks.
 * @property {AttackBonusesData} rwak        Bonuses to ranged weapon attacks.
 * @property {AttackBonusesData} msak        Bonuses to melee spell attacks.
 * @property {AttackBonusesData} rsak        Bonuses to ranged spell attacks.
 * @property {AbilityBonusesData} abilities  Bonuses to ability scores.
 * @property {SpellBonusesData} spell        Bonuses to spells.
 */
export class BonusesData extends DocumentData {
  static defineSchema() {
    return {
      mwak: {
        type: AttackBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.mwak")
      },
      rwak: {
        type: AttackBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.rwak")
      },
      msak: {
        type: AttackBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.msak")
      },
      rsak: {
        type: AttackBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.rsak")
      },
      abilities: {
        type: AbilityBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.abilities")
      },
      spell: {
        type: SpellBonusesData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.bonuses.spell")
      }
    };
  }
}

/**
 * An embedded data structure for global attack bonuses.
 * @extends DocumentData
 * @see BonusesData
 *
 * @property {string} attack  Numeric or dice bonus to attack rolls.
 * @property {string} damage  Numeric or dice bonus to damage rolls.
 */
export class AttackBonusesData extends DocumentData {
  static defineSchema() {
    return {
      attack: FORMULA_FIELD,
      damage: FORMULA_FIELD
    };
  }
}

/**
 * An embedded data structure for global ability bonuses.
 * @extends DocumentData
 * @see BonusesData
 *
 * @property {string} check  Numeric or dice bonus to ability checks.
 * @property {string} save   Numeric or dice bonus to ability saves.
 * @property {string} skill  Numeric or dice bonus to skill checks.
 */
export class AbilityBonusesData extends DocumentData {
  static defineSchema() {
    return {
      check: FORMULA_FIELD,
      save: FORMULA_FIELD,
      skill: FORMULA_FIELD
    };
  }
}

/**
 * An embedded data structure for global spell bonuses.
 * @extends DocumentData
 * @see BonusesData
 *
 * @property {string} dc  Numeric bonus to spellcasting DC.
 */
export class SpellBonusesData extends DocumentData {
  static defineSchema() {
    return {
      dc: DETERMINISTIC_FORMULA_FIELD
    };
  }
}
