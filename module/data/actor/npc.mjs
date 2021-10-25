import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { mergeObject } from "/common/utils/helpers.mjs";
import { defaultData } from "./base.mjs";
import * as creature from "./creature.mjs";


/**
 * Data definition for Non-Player Characters.
 * @extends creature.CreatureData
 *
 * @property {DetailsData} details      NPC type, environment, CR, and other extended details.
 * @property {ResourcesData} resources  NPC's legendary and lair resources.
 */
export class ActorNPCData extends creature.CreatureData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      details: { type: DetailsData, default: defaultData("npc.details") },
      resources: {
        type: ResourcesData,
        required: true,
        nullable: false,
        default: defaultData("npc.resources")
      }
    });
  }
}

/* -------------------------------------------- */
/*  Details                                     */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra details data used by NPCs.
 * @extends creature.DetailsData
 * @see ActorNPCData
 *
 * @property {TypeData} type       Creature type of this NPC.
 * @property {string} environment  Common environments in which this NPC is found.
 * @property {number} cr           NPC's challenge rating.
 * @property {number} spellLevel   Spellcasting level of this NPC.
 * @property {string} source       What book or adventure is this NPC from?
 */
export class DetailsData extends creature.DetailsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      type: {
        type: TypeData,
        required: true,
        nullable: false,
        default: defaultData("npc.details.type")
      },
      environment: fields.BLANK_STRING,
      cr: fields.field(fields.REQUIRED_POSITIVE_NUMBER, { default: 1 }),
      spellLevel: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      source: fields.BLANK_STRING
    });
  }
}

/**
 * An embedded data structure for NPC creature type.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {string} value    NPC's type as defined in the system configuration.
 * @property {string} subtype  NPC's subtype usually displayed in parenthesis after main type.
 * @property {string} swarm    Size of the individual creatures in a swarm or blank if NPC isn't a swarm.
 * @property {string} custom   Custom type beyond what is available in the configuration.
 */
class TypeData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.BLANK_STRING,
      subtype: fields.BLANK_STRING,
      swarm: fields.BLANK_STRING,
      custom: fields.BLANK_STRING
    };
  }
}

/* -------------------------------------------- */
/*  Resources                                   */
/* -------------------------------------------- */

/**
 * An embedded data structure for NPC resources.
 * @extends DocumentData
 * @see ActorCharacterData
 *
 * @property {LegendaryData} legact  NPC's legendary actions.
 * @property {LegendaryData} legres  NPC's legendary resistances.
 * @property {LairData} lair         NPC's lair actions.
 */
class ResourcesData extends DocumentData {
  static defineSchema() {
    return {
      legact: {
        type: LegendaryData,
        required: true,
        nullable: false,
        default: defaultData("npc.resources.legact")
      },
      legres: {
        type: LegendaryData,
        required: true,
        nullable: false,
        default: defaultData("npc.resources.legres")
      },
      lair: {
        type: LairData,
        required: true,
        nullable: false,
        default: defaultData("npc.resources.lair")
      }
    };
  }
}

/**
 * An embedded data structure for NPC's legendary actions or resistances.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {number} value  Currently available legendary actions or resistances.
 * @property {number} max    Maximum number of legendary actions or resistances.
 */
class LegendaryData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      max: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}

/**
 * An embedded data structure for NPC's lair actions.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {boolean} value      Does this NPC use lair actions.
 * @property {number} initiative  Initiative count when lair actions are triggered.
 */
class LairData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.BOOLEAN_FIELD,
      initiative: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}
