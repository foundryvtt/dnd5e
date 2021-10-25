import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { FORMULA_FIELD, mappingField } from "../fields.mjs";
import { defaultData } from "./base.mjs";


/**
 * Data definition for common data template.
 * @extends DocumentData
 *
 * @property {object<string, AbilityData>} abilities  Actor's ability scores.
 * @property {AttributeData} attributes               Armor class, hit points, movement, and initiative data.
 * @property {DetailsData} details                    Actor's biography.
 * @property {TraitsData} traits                      Actor's size, resistances, vulnerabilities, and immunities.
 * @property {CurrencyData} currency                  Currency being held by this actor.
 */
export class CommonData extends DocumentData {
  static defineSchema() {
    return {
      abilities: mappingField({
        type: AbilityData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.abilities")
      }),
      attributes: {
        type: AttributeData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.attributes")
      },
      details: {
        type: DetailsData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.details")
      },
      traits: {
        type: TraitsData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.traits")
      },
      currency: {
        type: CurrencyData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.currency")
      }
    };
  }
}

/* -------------------------------------------- */
/*  Abilities                                   */
/* -------------------------------------------- */

/**
 * An embedded data structure for actor ability scores.
 * @extends DocumentData
 * @see ActorData5e
 *
 * @property {number} value                Ability score.
 * @property {number} proficient           Proficiency value for saves.
 * @property {AbilityBonusesData} bonuses  Bonuses that modify ability checks and saves.
 */
export class AbilityData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 10
      }),
      proficient: fields.field(fields.NUMERIC_FIELD, fields.REQUIRED_NUMBER),
      bonuses: {
        type: AbilityBonusesData,
        required: true,
        default: defaultData("templates.common.abilities.dex.bonuses")
      }
    };
  }
}

/**
 * An embedded data structure for actor ability bonuses.
 * @extends DocumentData
 * @see AbilityData
 *
 * @property {string} check  Numeric or dice bonus to ability checks.
 * @property {string} save   Numeric or dice bonus to ability saving throws.
 */
class AbilityBonusesData extends DocumentData {
  static defineSchema() {
    return {
      check: FORMULA_FIELD,
      save: FORMULA_FIELD
    };
  }
}

/* -------------------------------------------- */
/*  Attributes                                  */
/* -------------------------------------------- */

/**
 * An embedded data structure for actor attributes.
 * @extends DocumentData
 * @see CommonData
 *
 * @property {ACData} ac              Data used to calculate actor's armor class.
 * @property {HPData} hp              Actor's hit point data.
 * @property {InitiativeData} init    Actor's initiative modifier and bonuses.
 * @property {MovementData} movement  Various actor movement speeds.
 */
export class AttributeData extends DocumentData {
  static defineSchema() {
    return {
      ac: {
        type: ACData,
        required: true,
        default: defaultData("templates.common.attributes.ac")
      },
      hp: {
        type: HPData,
        required: true,
        default: defaultData("templates.common.attributes.hp")
      },
      init: {
        type: InitiativeData,
        required: true,
        default: defaultData("templates.common.attributes.init")
      },
      movement: {
        type: MovementData,
        required: true,
        default: defaultData("templates.common.attributes.movement")
      }
    };
  }
}

/**
 * An embedded data structure for actor armor class.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} [flat]   Flat value used for flat or natural armor calculation.
 * @property {string} calc     Name of one of the built-in formulas to use.
 * @property {string} formula  Custom formula to use.
 */
export class ACData extends DocumentData {
  static defineSchema() {
    return {
      flat: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { nullable: true }),
      calc: fields.field(fields.REQUIRED_STRING, { default: "default" }),
      formula: FORMULA_FIELD
    };
  }
}

/**
 * An embedded data structure for actor hit points.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} value    Current hit points.
 * @property {number} min      Minimum allowed HP value.
 * @property {number} max      Maximum allowed HP value.
 * @property {number} temp     Temporary HP applied on top of value.
 * @property {number} tempmax  Temporary change to the maximum HP.
 */
export class HPData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 10
      }),
      min: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      max: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 10
      }),
      temp: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      tempmax: fields.field(fields.INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}

/**
 * An embedded data structure for actor initiative.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} value  Calculated initiative modifier.
 * @property {number} bonus  Fixed bonus provided to initiative rolls.
 */
export class InitiativeData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.INTEGER_FIELD, fields.REQUIRED_NUMBER),
      bonus: fields.field(fields.INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}

/**
 * An embedded data structure for actor movement.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {number} burrow  Actor burrowing speed.
 * @property {number} climb   Actor climbing speed.
 * @property {number} fly     Actor flying speed.
 * @property {number} swim    Actor swimming speed.
 * @property {number} walk    Actor walking speed.
 * @property {string} units   Movement used to measure the various speeds.
 * @property {boolean} hover  Is this flying creature able to hover in place.
 */
export class MovementData extends DocumentData {
  static defineSchema() {
    return {
      burrow: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      climb: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      fly: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      swim: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      walk: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: defaultData("templates.common.attributes.movement.walk")
      }),
      units: fields.field(fields.REQUIRED_STRING, { default: "ft" }),
      hover: fields.BOOLEAN_FIELD
    };
  }
}

/* -------------------------------------------- */
/*  Details                                     */
/* -------------------------------------------- */

/**
 * An embedded data structure for actor details.
 * @extends DocumentData
 * @see CommonData
 *
 * @property {BiographyData} biography  Actor's biography data.
 */
export class DetailsData extends DocumentData {
  static defineSchema() {
    return {
      biography: {
        type: BiographyData,
        required: true,
        default: defaultData("templates.common.details.biography")
      }
    };
  }
}

/**
 * An embedded data structure for actor biography.
 * @extends DocumentData
 * @see DetailsData
 *
 * @property {string} value   Full HTML biography information.
 * @property {string} public  Biography that will be displayed to players with only observer privileges.
 */
export class BiographyData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.BLANK_STRING,
      public: fields.BLANK_STRING
    };
  }
}

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure representing shared traits.
 * @extends DocumentData
 * @see CommonData
 *
 * @property {string} size         Actor's size.
 * @property {SimpleTraitData} di  Damage immunities.
 * @property {SimpleTraitData} dr  Damage resistances.
 * @property {SimpleTraitData} dv  Damage vulnerabilities.
 * @property {SimpleTraitData} ci  Condition immunities.
 */
export class TraitsData extends DocumentData {
  static defineSchema() {
    return {
      size: fields.field(fields.REQUIRED_STRING, { default: "med" }),
      di: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.traits.di")
      },
      dr: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.traits.dr")
      },
      dv: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.traits.dv")
      },
      ci: {
        type: SimpleTraitData,
        required: true,
        nullable: false,
        default: defaultData("templates.common.traits.ci")
      }
    };
  }
}

/**
 * An embedded data structure for storing simple traits.
 * @extends DocumentData
 * @see TraitsData
 *
 * @property {string[]} value  Currently selected traits.
 * @property {string} custom   Semicolon-separated list of custom traits.
 */
export class SimpleTraitData extends DocumentData {
  static defineSchema() {
    return {
      value: {
        type: [String],
        required: true,
        nullable: false,
        default: []
      },
      custom: fields.BLANK_STRING
    };
  }
}

/* -------------------------------------------- */
/*  Currency                                    */
/* -------------------------------------------- */

/**
 * An embedded data structure for currently held currencies.
 * @extends CommonData
 * @see DetailsData
 *
 * @property {number} pp  Platinum pieces.
 * @property {number} gp  Gold pieces.
 * @property {number} ep  Electrum pieces.
 * @property {number} sp  Silver pieces.
 * @property {number} cp  Copper pieces.
 */
export class CurrencyData extends DocumentData {
  static defineSchema() {
    return {
      pp: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      gp: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      ep: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      sp: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      cp: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}
