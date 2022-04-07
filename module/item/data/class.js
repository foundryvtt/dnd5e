import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


/**
 * Data definition for Class items.
 * @extends DocumentData
 * @see common.ItemDescriptionData
 *
 * @property {number} levels       Current number of levels in this class.
 * @property {string} subclass     Name of subclass chosen.
 * @property {string} hitDice      Denomination of hit dice available as defined in `DND5E.hitDieTypes`.
 * @property {number} hitDiceUsed  Number of hit dice consumed.
 * @property {string[]} saves      Savings throws in which this class grants proficiency.
 * @property {SkillsData} skills   Available class skills and selected skills.
 * @property {SpellcastingData} spellcasting  Details on class's spellcasting ability.
 */
export class ItemClassData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      {
        levels: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
          required: true,
          nullable: false,
          default: 1
        }),
        subclass: fields.BLANK_STRING,
        hitDice: fields.field(fields.REQUIRED_STRING, { default: defaultData("class.hitDice") }),
        hitDiceUsed: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
        saves: {
          type: [String],
          required: true,
          nullable: false,
          default: []
        },
        skills: {
          type: SkillsData,
          required: true,
          nullable: false,
          default: defaultData("class.skills")
        },
        spellcasting: {
          type: SpellcastingData,
          required: true,
          nullable: false,
          default: defaultData("class.spellcasting")
        }
      }
    );
  }
}

/**
 * An embedded data structure for skills granted by class.
 * @extends DocumentData
 * @see ItemClassData
 *
 * @property {number} number     Number of skills selectable by the player.
 * @property {string[]} choices  List of skill keys that are valid to be chosen.
 * @property {string[]} value    List of skill keys the player has chosen.
 */
class SkillsData extends DocumentData {
  static defineSchema() {
    return {
      number: fields.field(fields.POSITIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: defaultData("class.skills.number")
      }),
      choices: {
        type: [String],
        required: true,
        nullable: false,
        default: []
      },
      value: {
        type: [String],
        required: true,
        nullable: false,
        default: []
      }
    };
  }
}

/**
 * An embedded data structure for class spellcasting details.
 * @extends DocumentData
 * @see ItemClassData
 *
 * @property {string} progression  Type of spell progression granted by class as defined in `DND5E.spellProgression`.
 * @property {string} ability      Ability score to use for spellcasting.
 */
class SpellcastingData extends DocumentData {
  static defineSchema() {
    return {
      progression: fields.field(fields.REQUIRED_STRING, { default: defaultData("class.spellcasting.progression") }),
      ability: fields.BLANK_STRING
    };
  }
}

