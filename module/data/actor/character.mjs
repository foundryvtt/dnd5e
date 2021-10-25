import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { mergeObject } from "/common/utils/helpers.mjs";
import { defaultData } from "./base.mjs";
import { SimpleTraitData } from "./common.mjs";
import * as creature from "./creature.mjs";


/**
 * Data definition for Player Characters.
 * @extends creature.CreatureData
 *
 * @property {AttributesData} attributes  Extended attributes with death saves, exhaustion, and inspiration.
 * @property {DetailsData} details        Extended details with additional character biography.
 * @property {ResourcesData} resources    Actor's three resources.
 * @property {TraitsData} traits          Extended traits with character's proficiencies.
 */
export class ActorCharacterData extends creature.CreatureData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      attributes: { type: AttributeData, default: defaultData("character.attributes") },
      details: { type: DetailsData, default: defaultData("character.details") },
      resources: {
        type: ResourcesData,
        required: true,
        nullable: false,
        default: defaultData("character.resources")
      },
      traits: { type: TraitsData, default: defaultData("character.traits") }
    });
  }
}

/* -------------------------------------------- */
/*  Attributes                                  */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra attribute data used by characters.
 * @extends creature.AttributeData
 * @see ActorCharacterData
 *
 * @property {DeathData} death     Information on death saving throws.
 * @property {number} exhaustion   Number of levels of exhaustion.
 * @property {number} inspiration  Does this character have inspiration?
 */
class AttributeData extends creature.AttributeData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      death: {
        type: DeathData,
        required: true,
        nullable: false,
        default: defaultData("character.attributes.death")
      },
      exhaustion: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      inspiration: fields.BOOLEAN_FIELD
    });
  }
}

/**
 * An embedded data structure for tracking character death saves.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} success  Number of successful death saves.
 * @property {number} failure  Number of failed death saves.
 */
class DeathData extends DocumentData {
  static defineSchema() {
    return {
      success: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      failure: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}

/* -------------------------------------------- */
/*  Details                                     */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra details data used by characters.
 * @extends creature.DetailsData
 * @see ActorCharacterData
 *
 * @property {string} background     Name of character's background.
 * @property {string} originalClass  ID of first class taken by character.
 * @property {XPData} xp             Experience points gained.
 * @property {string} appearance     Description of character's appearance.
 * @property {string} trait          Character's personality traits.
 * @property {string} ideal          Character's ideals.
 * @property {string} bond           Character's bonds.
 * @property {string} flaw           Character's flaws.
 */
export class DetailsData extends creature.DetailsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      background: fields.BLANK_STRING,
      originalClass: {
        type: String,
        required: true,
        nullable: false,
        default: "",
        validate: fields._validateId
      },
      xp: {
        type: XPData,
        required: true,
        nullable: false,
        default: defaultData("character.details.xp")
      },
      appearance: fields.BLANK_STRING,
      trait: fields.BLANK_STRING,
      ideal: fields.BLANK_STRING,
      bond: fields.BLANK_STRING,
      flaw: fields.BLANK_STRING
    });
  }
}

/**
 * An embedded data structure for character experience points.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {number} value  Total experience points earned.
 * @property {number} min    Minimum experience points for current level.
 * @property {number} max    Maximum experience points for current level.
 */
class XPData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      min: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      max: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 300
      })
    };
  }
}

/* -------------------------------------------- */
/*  Resources                                   */
/* -------------------------------------------- */

/**
 * An embedded data structure for character resources.
 * @extends DocumentData
 * @see ActorCharacterData
 *
 * @property {ResourceData} primary    Resource number one.
 * @property {ResourceData} secondary  Resource number two.
 * @property {ResourceData} tertiary   Resource number three.
 */
class ResourcesData extends DocumentData {
  static defineSchema() {
    return {
      primary: {
        type: ResourceData,
        required: true,
        nullable: false,
        default: defaultData("character.resources.primary")
      },
      secondary: {
        type: ResourceData,
        required: true,
        nullable: false,
        default: defaultData("character.resources.secondary")
      },
      tertiary: {
        type: ResourceData,
        required: true,
        nullable: false,
        default: defaultData("character.resources.tertiary")
      }
    };
  }
}

/**
 * An embedded data structure for individual resource properties.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {number} value  Available uses of this resource.
 * @property {number} max    Maximum allowed uses of this resource.
 * @property {boolean} sr    Does this resource recover on a short rest?
 * @property {boolean} lr    Does this resource recover on a long rest?
 * @property {string} label  Displayed name.
 */
class ResourceData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { nullable: true, default: 0 }),
      max: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { nullable: true, default: 0 }),
      sr: fields.BOOLEAN_FIELD,
      lr: fields.BOOLEAN_FIELD,
      label: fields.BLANK_STRING
    };
  }
}

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra trait data used by characters.
 * @extends creature.TraitsData
 * @see ActorCharacterData
 *
 * @property {SimpleTraitData} weaponProf  Character's weapon proficiencies.
 * @property {SimpleTraitData} armorProf   Character's armor proficiencies.
 * @property {SimpleTraitData} toolProf    Character's tool proficiencies.
 */
class TraitsData extends creature.TraitsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      weaponProf: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("character.traits.weaponProf")
      },
      armorProf: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("character.traits.armorProf")
      },
      toolProf: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("character.traits.toolProf")
      }
    });
  }
}
