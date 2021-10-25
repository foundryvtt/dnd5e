import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { mergeObject } from "/common/utils/helpers.mjs";
import { defaultData } from "./base.mjs";
import * as common from "./common.mjs";


/**
 * Data definition for Vehicles.
 * @extends creature.CommonData
 *
 * @property {string} vehicleType        Type of vehicle as defined in `DND5E.vehicleTypes`.
 * @property {AttributeData} attributes  Extended attributes with additional vehicle information.
 * @property {TraitsData} traits         Extended traits with vehicle dimensions.
 * @property {CargoData} cargo           Details on this vehicle's crew and cargo capacities.
 */
export class ActorVehicleData extends common.CommonData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      vehicleType: fields.field(fields.REQUIRED_STRING, { default: defaultData("vehicle.vehicleType") }),
      abilities: { default: defaultData("vehicle.abilities") },
      attributes: { type: AttributeData, default: defaultData("vehicle.attributes") },
      traits: { type: TraitsData, default: defaultData("vehicle.traits") },
      cargo: {
        type: CargoData,
        required: true,
        nullable: false,
        default: defaultData("vehicle.cargo")
      }
    });
  }
}

/* -------------------------------------------- */
/*  Attributes                                  */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra attribute data used by vehicles.
 * @extends common.AttributeData
 * @see ActorVehicleData
 *
 * @property {ACData} ac              Vehicle's armor class with extra properties.
 * @property {ActionData} actions     Information on how the vehicle performs actions.
 * @property {HPData} hp              Vehicle's hit points with extra properties.
 * @property {CapacityData} capacity  Information on the vehicle's carrying capacity.
 */
class AttributeData extends common.AttributeData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      ac: { type: ACData, default: defaultData("vehicle.attributes.ac") },
      actions: {
        type: ActionData,
        required: true,
        nullable: false,
        default: defaultData("vehicle.attributes.actions")
      },
      hp: { type: HPData, default: defaultData("vehicle.attributes.hp") },
      capacity: {
        type: CapacityData,
        required: true,
        nullable: false,
        default: defaultData("vehicle.attributes.capacity")
      }
    });
  }
}

/**
 * An embedded data structure for vehicle's armor class.
 * @extends common.ACData
 * @see AttributeData
 *
 * @property {number} [value]     Vehicle's armor class.
 * @property {string} motionless  Changes to vehicle AC when not moving.
 */
class ACData extends common.ACData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      motionless: fields.BLANK_STRING
    });
  }
}

/**
 * An embedded data structure that details how the vehicle performs actions.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {boolean} stations                   Does this vehicle rely on action stations that required individual
 *                                                crewing rather than general crew thresholds?
 * @property {number} value                       Maximum number of actions available with full crewing.
 * @property {object<string, number>} thresholds  Crew thresholds needed to perform various actions.
 */
class ActionData extends DocumentData {
  static defineSchema() {
    return {
      stations: fields.BOOLEAN_FIELD,
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
      thresholds: {
        type: ThresholdData,
        required: true,
        nullable: false,
        default: defaultData("vehicle.attributes.actions.thresholds")
      }
    };
  }
}

/**
 * An embedded data structure defining vehicle crew action thresholds.
 * @extends DocumentData
 * @see ActionData
 *
 * @property {number} 2  Minimum crew needed to take full action complement.
 * @property {number} 1  Minimum crew needed to take reduced action complement.
 * @property {number} 0  Minimum crew needed to perform any actions.
 */
class ThresholdData extends DocumentData {
  static defineSchema() {
    return {
      2: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      1: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      0: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null })
    };
  }
}

/**
 * An embedded data structure for vehicle's hit points.
 * @extends common.HPData
 * @see AttributeData
 *
 * @property {number} [value]  Current hit points.
 * @property {number} [max]    Maximum allowed HP value.
 * @property {number} [dt]     Damage threshold.
 * @property {number} [mt]     Mishap threshold.
 */
class HPData extends common.HPData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      value: { nullable: true, default: null },
      max: { nullable: true, default: null },
      dt: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      mt: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null })
    });
  }
}

/**
 * An embedded data structure that defines the vehicle's carrying capacity.
 * @extends DocumentData
 * @see AttributeData
 *
 * @property {string} creature  Description of the number of creatures the vehicle can carry.
 * @property {number} cargo     Cargo carrying capacity measured in tons.
 */
class CapacityData extends DocumentData {
  static defineSchema() {
    return {
      creature: fields.BLANK_STRING,
      cargo: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}

/* -------------------------------------------- */
/*  Traits                                      */
/* -------------------------------------------- */

/**
 * An embedded data structure for extra trait data used by vehicles.
 * @extends common.TraitsData
 * @see ActorVehicleData
 *
 * @property {string} dimensions  Description of the vehicle's size.
 */
class TraitsData extends common.TraitsData {
  static defineSchema() {
    return mergeObject(super.defineSchema(), {
      dimensions: fields.BLANK_STRING
    });
  }
}

/* -------------------------------------------- */
/*  Cargo                                       */
/* -------------------------------------------- */

/**
 * An embedded data structure for vehicle crew and passengers.
 * @extends DocumentData
 * @see ActorVehicleData
 *
 * @property {PassengerData[]} crew        Creatures responsible for operating the vehicle.
 * @property {PassengerData[]} passengers  Creatures just takin' a ride.
 */
class CargoData extends DocumentData {
  static defineSchema() {
    return {
      crew: {
        type: [PassengerData],
        required: true,
        nullable: false,
        default: []
      },
      passengers: {
        type: [PassengerData], // TODO: Figure out why this is being turned into a PassengerData object rather than raw object
        required: true,
        nullable: false,
        default: []
      }
    };
  }
}

/**
 * An embedded data structure representing an entry in the crew or passenger lists.
 * @extends DocumentData
 * @see CargoData
 *
 * @property {string} name      Name of individual or type of creature.
 * @property {number} quantity  How many of this creature are onboard?
 */
class PassengerData extends DocumentData {
  static defineSchema() {
    return {
      name: fields.BLANK_STRING,
      quantity: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER)
    };
  }
}
