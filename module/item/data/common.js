import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, NONNEGATIVE_NUMBER_FIELD, NULLABLE_STRING } from "./base.js";


/* -------------------------------------------- */
/*  Item Description                            */
/* -------------------------------------------- */

/**
 * An embedded data structure for item description & source.
 * @extends DocumentData
 *
 * @property {DescriptionData} description  Various item descriptions.
 * @property {string} source                Adventure or sourcebook where this item originated.
 */
export class ItemDescriptionData extends DocumentData {
  static defineSchema() {
    return {
      description: {
        type: DescriptionData,
        required: true,
        nullable: false,
        default: defaultData("templates.itemDescription.description")
      },
      source: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for various item descriptions.
 * @extends DocumentData
 *
 * @property {string} value         Full item description.
 * @property {string} chat          Description displayed in chat card.
 * @property {string} unidentified  Description displayed if item is unidentified.
 */
export class DescriptionData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.BLANK_STRING,
      chat: fields.BLANK_STRING,
      unidentified: fields.BLANK_STRING
    }
  }
}

/* -------------------------------------------- */
/*  PhysicalItem                                */
/* -------------------------------------------- */

/**
 * An embedded data structure containing information on physical items.
 * @extends DocumentData
 *
 * @property {number} quantity     Number of items in a stack.
 * @property {number} weight       Item's weight in pounds or kilograms (depending on system setting).
 * @property {number} price        Item's cost in GP.
 * @property {number} attunement   Attunement information as defined in `DND5E.attunementTypes`.
 * @property {boolean} equipped    Is this item equipped on its owning actor.
 * @property {string} rarity       Item rarity as defined in `DND5E.itemRarity`.
 * @property {boolean} identified  Has this item been identified?
 */
export class PhysicalItemData extends DocumentData {
  static defineSchema() {
    return {
      quantity: fields.field(fields.POSITIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 1
      }),
      weight: fields.field(NONNEGATIVE_NUMBER_FIELD, fields.REQUIRED_NUMBER),
      price: fields.field(NONNEGATIVE_NUMBER_FIELD, fields.REQUIRED_NUMBER),
      attunement: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      equipped: fields.BOOLEAN_FIELD,
      rarity: fields.BLANK_STRING,
      identified: fields.field(fields.BOOLEAN_FIELD, { default: true })
    }
  }
}

/* -------------------------------------------- */
/*  Activated Effect                            */
/* -------------------------------------------- */

/**
 * An embedded data structure for items that can be used as some sort of action.
 * @extends DocumentData
 *
 * @property {ActivationData} activation  Effect's activation conditions.
 * @property {DurationData} duration      Effect's duration.
 * @property {TargetData} target          Effect's valid targets.
 * @property {RangeData} range            Effect's range.
 * @property {UsesData} uses              Effect's limited uses.
 * @property {ConsumeData} consume        Effect's resource consumption.
 */
export class ActivatedEffectData extends DocumentData {
  static defineSchema() {
    return {
      activation: {
        type: ActivationData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.activation")
      },
      duration: {
        type: DurationData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.duration")
      },
      target: {
        type: TargetData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.target")
      },
      range: {
        type: RangeData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.range")
      },
      uses: {
        type: UsesData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.uses")
      },
      consume: {
        type: ConsumeData,
        required: true,
        nullable: false,
        default: defaultData("templates.activatedEffect.consume")
      }
    }
  }
}

/**
 * An embedded data structure for item activation details.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {string} type       Activation type as defined in `DND5E.abilityActivationTypes`.
 * @property {number} cost       How much of the activation type is needed to use this item's effect.
 * @property {string} condition  Special conditions required to activate the item.
 */
export class ActivationData extends DocumentData {
  static defineSchema() {
    return {
      type: fields.BLANK_STRING,
      cost: fields.REQUIRED_NUMBER,
      condition: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for item usage duration.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value  How long the effect lasts.
 * @property {string} units  Time duration period as defined in `DND5E.timePeriods`.
 */
export class DurationData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      units: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for item targeting.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value  Length or radius of target depending on targeting mode selected.
 * @property {number} width  Width of line when line type is selected.
 * @property {string} units  Units used for value and width as defined in `DND5E.distanceUnits`.
 * @property {string} type   Targeting mode as defined in `DND5E.targetTypes`.
 */
export class TargetData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      width: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      units: fields.BLANK_STRING,
      type: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for item range.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value  Regular targeting distance for item's effect.
 * @property {number} long   Maximum targeting distance for features that have a separate long range.
 * @property {string} units  Units used for value and long as defined in `DND5E.distanceUnits`.
 */
export class RangeData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      long: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      units: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for item limited uses.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value  Current available uses.
 * @property {string} max    Maximum possible uses or a formula to derive that number.
 * @property {string} per    Recharge time for limited uses as defined in `DND5E.limitedUsePeriods`.
 */
export class UsesData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      max: fields.BLANK_STRING,
      per: NULLABLE_STRING
    }
  }
}

/**
 * An embedded data structure for items that consume resources.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {string} type    Type of resource to consume as defined in `DND5E.abilityConsumptionTypes`.
 * @property {string} target  Item ID or resource key path of resource to consume.
 * @property {number} amount  Quantity of the resource to consume per use.
 */
export class ConsumeData extends DocumentData {
  static defineSchema() {
    return {
      type: fields.BLANK_STRING,
      target: NULLABLE_STRING,
      amount: fields.field(fields.NUMERIC_FIELD, { default: null })
    }
  }
}

/* -------------------------------------------- */
/*  Action                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for item actions.
 * @extends DocumentData
 *
 * @property {string} ability         Ability score to use when determining modifier.
 * @property {string} actionType      Action type as defined in `DND5E.itemActionTypes`.
 * @property {string} attackBonus     Numeric or dice bonus to attack rolls.
 * @property {string} chatFlavor      Extra text displayed in chat.
 * @property {CriticalData} critical  Information on how critical hits are handled.
 * @property {DamageData} damage      Item damage formulas.
 * @property {string} formula         Other roll formula.
 * @property {SaveData} save          Item saving throw data.
 */
export class ActionData extends DocumentData {
  static defineSchema() {
    return {
      ability: fields.field(NULLABLE_STRING, { default: defaultData("templates.action.ability") }),
      actionType: fields.field(NULLABLE_STRING, { default: defaultData("templates.action.actionType") }),
      attackBonus: fields.field(NULLABLE_STRING, { default: defaultData("templates.action.attackBonus") }),
      chatFlavor: fields.BLANK_STRING,
      critical: {
        type: CriticalData,
        required: true,
        nullable: false,
        default: defaultData("templates.action.critical")
      },
      damage: {
        type: DamageData,
        required: true,
        nullable: false,
        default: defaultData("templates.action.damage")
      },
      formula: fields.BLANK_STRING,
      save: {
        type: SaveData,
        required: true,
        nullable: false,
        default: defaultData("templates.action.save")
      }
    }
  }
}

/**
 * An embedded data structure for item critical hit configuration.
 * @extends DocumentData
 * @see ActionData
 *
 * @property {number} threshold  Minimum number on the dice to roll a critical hit.
 * @property {string} [damage]   Extra damage on critical hit.
 */
export class CriticalData extends DocumentData {
  static defineSchema() {
    return {
      threshold: fields.field(fields.POSITIVE_INTEGER_FIELD, { default: null }),
      damage: NULLABLE_STRING
    }
  }
}

/**
 * An embedded data structure for item damages.
 * @extends DocumentData
 * @see ActionData
 *
 * @property {Array<Array<String>>} parts  Array of damage formula and types.
 * @property {string} versatile            Special versatile damage formula.
 */
export class DamageData extends DocumentData {
  static defineSchema() {
    return {
      parts: {
        type: [[String]],
        required: true,
        nullable: false,
        default: []
      },
      versatile: fields.BLANK_STRING
    }
  }
}

/**
 * An embedded data structure for item saving throws.
 * @extends DocumentData
 * @see ActionData
 *
 * @property {string} ability  Ability required for the save.
 * @property {number} [dc]     Custom saving throw value.
 * @property {string} scaling  Method for automatically determining saving throw DC.
 */
export class SaveData extends DocumentData {
  static defineSchema() {
    return {
      ability: fields.BLANK_STRING,
      dc: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      scaling: fields.field(fields.REQUIRED_STRING, { default: defaultData("templates.action.save.scaling") })
    }
  }
}

/* -------------------------------------------- */
/*  Mountable                                   */
/* -------------------------------------------- */

/**
 * An embedded data structure for equipment that can be mounted on a vehicle.
 * @extends DocumentData
 *
 * @property {ArmorData} armor  Equipment's armor class.
 * @property {HPData} hp        Equipment's hit points.
 */
export class MountableData extends DocumentData {
  static defineSchema() {
    return {
      armor: {
        type: ArmorData,
        required: true,
        nullable: false,
        default: defaultData("templates.mountable.armor")
      },
      hp: {
        type: HPData,
        required: true,
        nullable: false,
        default: defaultData("templates.mountable.hp")
      }
    }
  }
}

/**
 * An embedded data structure for mountable equipment armor class.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value  Armor class value for equipment.
 */
export class ArmorData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: defaultData("templates.mountable.armor.value") })
    }
  }
}

/**
 * An embedded data structure for mountable equipment hit points.
 * @extends DocumentData
 * @see ActivatedEffectData
 *
 * @property {number} value       Current hit point value.
 * @property {number} max         Max hit points.
 * @property {number} [dt]        Damage threshold.
 * @property {string} conditions  Conditions that are triggered when this equipment takes damage.
 */
export class HPData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      max: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      dt: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      conditions: fields.BLANK_STRING
    }
  }
}
