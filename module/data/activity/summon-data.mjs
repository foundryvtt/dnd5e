import FormulaField from "../fields/formula-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * Information for a single summoned creature.
 *
 * @typedef {object} SummonsProfile
 * @property {string} _id         Unique ID for this profile.
 * @property {string} count       Formula for the number of creatures to summon.
 * @property {string} cr          Formula for the CR of summoned creatures if in CR mode.
 * @property {object} level
 * @property {number} level.min   Minimum level at which this profile can be used.
 * @property {number} level.max   Maximum level at which this profile can be used.
 * @property {string} name        Display name for this profile if it differs from actor's name.
 * @property {Set<string>} types  Types of summoned creatures if in CR mode.
 * @property {string} uuid        UUID of the actor to summon if in default mode.
 */

/**
 * Data model for a summon activity.
 *
 * @property {object} bonuses
 * @property {string} bonuses.ac            Formula for armor class bonus on summoned actor.
 * @property {string} bonuses.hd            Formula for bonus hit dice to add to each summoned NPC.
 * @property {string} bonuses.hp            Formula for bonus hit points to add to each summoned actor.
 * @property {string} bonuses.attackDamage  Formula for bonus added to damage for attacks.
 * @property {string} bonuses.saveDamage    Formula for bonus added to damage for saving throws.
 * @property {string} bonuses.healing       Formula for bonus added to healing.
 * @property {Set<string>} creatureSizes    Set of creature sizes that will be set on summoned creature.
 * @property {Set<string>} creatureTypes    Set of creature types that will be set on summoned creature.
 * @property {object} match
 * @property {boolean} match.attacks        Match the to hit values on summoned actor's attack to the summoner.
 * @property {boolean} match.proficiency    Match proficiency on summoned actor to the summoner.
 * @property {boolean} match.saves          Match the save DC on summoned actor's abilities to the summoner.
 * @property {SummonsProfile[]} profiles    Information on creatures that can be summoned.
 * @property {object} summon
 * @property {string} summon.identifier     Class identifier that will be used to determine applicable level.
 * @property {""|"cr"} summon.mode          Method of determining what type of creature is summoned.
 * @property {boolean} summon.prompt        Should the player be prompted to place the summons?
 */
export default class SummonActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const fields = super.defineSchema();
    delete fields.effects;
    return {
      ...fields,
      bonuses: new SchemaField({
        ac: new FormulaField(),
        hd: new FormulaField(),
        hp: new FormulaField(),
        attackDamage: new FormulaField(),
        saveDamage: new FormulaField(),
        healing: new FormulaField()
      }),
      creatureSizes: new SetField(new StringField()),
      creatureTypes: new SetField(new StringField()),
      match: new SchemaField({
        attacks: new BooleanField(),
        proficiency: new BooleanField(),
        saves: new BooleanField()
      }),
      profiles: new ArrayField(new SchemaField({
        _id: new DocumentIdField({initial: () => foundry.utils.randomID()}),
        count: new FormulaField(),
        cr: new FormulaField({deterministic: true}),
        level: new SchemaField({
          min: new NumberField({integer: true, min: 0}),
          max: new NumberField({integer: true, min: 0})
        }),
        name: new StringField(),
        types: new SetField(new StringField()),
        uuid: new StringField()
      })),
      summon: new SchemaField({
        identifier: new IdentifierField(),
        mode: new StringField(),
        prompt: new BooleanField({ initial: true })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get actionType() {
    return "summ";
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    return foundry.utils.mergeObject(activityData, {
      bonuses: source.system.summons?.bonuses ?? {},
      creatureSizes: source.system.summons?.creatureSizes ?? [],
      creatureTypes: source.system.summons?.creatureTypes ?? [],
      match: source.system.summons?.match ?? {},
      profiles: source.system.summons?.profiles ?? [],
      summon: {
        identifier: source.system.summons?.classIdentifier ?? "",
        mode: source.system.summons?.mode ?? "",
        prompt: source.system.summons?.prompt ?? true
      }
    });
  }
}
