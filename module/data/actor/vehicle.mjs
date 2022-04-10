import { FormulaField } from "../fields.mjs";
import * as common from "./common.mjs";

/**
 * Data definition for Vehicles.
 *
 * @property {string} vehicleType                Type of vehicle as defined in `DND5E.vehicleTypes`.
 * @property {AttributeData} attributes          Extended attributes with additional vehicle information.
 * @property {TraitsData} traits                 Extended traits with vehicle dimensions.
 * @property {object} cargo                      Details on this vehicle's crew and cargo capacities.
 * @property {PassengerData[]} cargo.crew        Creatures responsible for operating the vehicle.
 * @property {PassengerData[]} cargo.passengers  Creatures just takin' a ride.
 */
export default class ActorVehicleData extends common.CommonData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      vehicleType: new foundry.data.fields.StringField({required: true, initial: "water", label: "DND5E.VehicleType"}),
      // TODO: Mental abilities should default to zero
      attributes: new foundry.data.fields.EmbeddedDataField(AttributeData, {label: "DND5E.Attributes"}),
      traits: new foundry.data.fields.EmbeddedDataField(TraitsData, {label: "DND5E.Traits"}),
      cargo: new foundry.data.fields.SchemaField({
        crew: new foundry.data.fields.ArrayField(
          new foundry.data.fields.EmbeddedDataField(PassengerData), {label: "DND5E.VehicleCrew"}
        ),
        passengers: new foundry.data.fields.ArrayField(
          new foundry.data.fields.EmbeddedDataField(PassengerData), {label: "DND5E.VehiclePassengers"}
        )
      }, {label: "DND5E.VehicleCrewPassengers"})
    };
  }
}

/**
 * An embedded data structure for extra attribute data used by vehicles.
 * @see ActorVehicleData
 *
 * @property {object} ac                    Data used to calculate vehicle's armor class.
 * @property {number} ac.flat               Flat value used for flat or natural armor calculation.
 * @property {string} ac.calc               Name of one of the built-in formulas to use.
 * @property {string} ac.formula            Custom formula to use.
 * @property {string} ac.motionless         Changes to vehicle AC when not moving.
 * @property {object} actions               Information on how the vehicle performs actions.
 * @property {boolean} actions.stations     Does this vehicle rely on action stations that required individual
 *                                          crewing rather than general crew thresholds?
 * @property {number} actions.value         Maximum number of actions available with full crewing.
 * @property {object} actions.thresholds    Crew thresholds needed to perform various actions.
 * @property {number} actions.thresholds.2  Minimum crew needed to take full action complement.
 * @property {number} actions.thresholds.1  Minimum crew needed to take reduced action complement.
 * @property {number} actions.thresholds.0  Minimum crew needed to perform any actions.
 * @property {object} hp                    Vehicle's hit point data.
 * @property {number} hp.value              Current hit points.
 * @property {number} hp.min                Minimum allowed HP value.
 * @property {number} hp.max                Maximum allowed HP value.
 * @property {number} hp.temp               Temporary HP applied on top of value.
 * @property {number} hp.tempmax            Temporary change to the maximum HP.
 * @property {number} hp.dt                 Damage threshold.
 * @property {number} hp.mt                 Mishap threshold.
 * @property {object} capacity              Information on the vehicle's carrying capacity.
 * @property {string} capacity.creature     Description of the number of creatures the vehicle can carry.
 * @property {number} capacity.cargo        Cargo carrying capacity measured in tons.
 */
export class AttributeData extends common.AttributeData {
  static defineSchema() {
    const schema = super.defineSchema();
    const hpFields = foundry.utils.deepClone(schema.hp.fields);
    Object.values(hpFields).forEach(v => v.parent = undefined);
    hpFields.value.nullable = true;
    hpFields.value.initial = null;
    hpFields.max.nullable = true;
    hpFields.max.initial = null;
    hpFields.temp.initial = null;
    hpFields.tempmax.initial = null;
    return {
      ...schema,
      ac: new foundry.data.fields.SchemaField({
        flat: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.ArmorClassFlat"
        }),
        calc: new foundry.data.fields.StringField({
          required: true, initial: "flat", label: "DND5E.ArmorClassCalculation"
        }),
        formula: new FormulaField({required: true, deterministic: true, label: "DND5E.ArmorClassFormula"}),
        motionless: new foundry.data.fields.StringField({required: true, label: "DND5E.ArmorClassMotionless"})
      }, { label: "DND5E.ArmorClass" }),
      action: new foundry.data.fields.SchemaField({
        stations: new foundry.data.fields.BooleanField({required: true, label: "DND5E.VehicleActionStations"}),
        value: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.VehicleActionMax"
        }),
        thresholds: new foundry.data.fields.SchemaField({
          2: new foundry.data.fields.NumberField({
            required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsFull"
          }),
          1: new foundry.data.fields.NumberField({
            required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsMid"
          }),
          0: new foundry.data.fields.NumberField({
            required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsMin"
          })
        }, {label: "DND5E.VehicleActionThresholds"})
      }, {label: "DND5E.VehicleActions"}),
      hp: new foundry.data.fields.SchemaField({
        ...hpFields,
        dt: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.DamageThreshold"
        }),
        mt: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.VehicleMishapThreshold"
        })
      }, schema.hp.options),
      capacity: new foundry.data.fields.SchemaField({
        creature: new foundry.data.fields.StringField({required: true, label: "DND5E.VehicleCreatureCapacity"}),
        cargo: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.VehicleCargoCapacity"
        })
      }, {label: "DND5E.VehicleCargoCrew"})
    };
  }
}

/**
 * An embedded data structure for extra trait data used by vehicles.
 * @see ActorVehicleData
 *
 * @property {string} dimensions  Description of the vehicle's size.
 */
export class TraitsData extends common.TraitsData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.size.initial = "lg";
    schema.di.fields.value.initial = ["poison", "psychic"];
    schema.ci.fields.value.initial = [
      "blinded", "charmed", "deafened", "frightened", "paralyzed", "petrified", "poisoned", "stunned", "unconscious"
    ];
    return {
      ...schema,
      dimensions: new foundry.data.fields.StringField({required: true, label: "DND5E.Dimensions"})
    };
  }
}

/**
 * An embedded data structure representing an entry in the crew or passenger lists.
 * @see CargoData
 *
 * @property {string} name      Name of individual or type of creature.
 * @property {number} quantity  How many of this creature are onboard?
 */
export class PassengerData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      name: new foundry.data.fields.StringField({required: true, label: "DND5E.VehiclePassengerName"}),
      quantity: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.VehiclePassengerQuantity"
      })
    };
  }
}
