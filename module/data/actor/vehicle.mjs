import MovementField from "../shared/movement-field.mjs";
import SourceField from "../shared/source-field.mjs";
import DamageTraitField from "./fields/damage-trait-field.mjs";
import SimpleTraitField from "./fields/simple-trait-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CommonTemplate from "./templates/common.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const { ArrayField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { SourceData } from "../shared/source-field.mjs"
 * @import { ArmorClassData } from "./templates/attributes.mjs"
 */

/**
 * System data definition for Vehicles.
 *
 * @property {string} vehicleType                      Type of vehicle as defined in `DND5E.vehicleTypes`.
 * @property {object} attributes
 * @property {ArmorClassData} attributes.ac
 * @property {string} attributes.ac.motionless         Changes to vehicle AC when not moving.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value              Current hit points.
 * @property {number} attributes.hp.max                Maximum allowed HP value.
 * @property {number} attributes.hp.temp               Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax            Temporary change to the maximum HP.
 * @property {number} attributes.hp.dt                 Damage threshold.
 * @property {number} attributes.hp.mt                 Mishap threshold.
 * @property {object} attributes.actions               Information on how the vehicle performs actions.
 * @property {boolean} attributes.actions.stations     Does this vehicle rely on action stations that required
 *                                                     individual crewing rather than general crew thresholds?
 * @property {number} attributes.actions.value         Maximum number of actions available with full crewing.
 * @property {object} attributes.actions.thresholds    Crew thresholds needed to perform various actions.
 * @property {number} attributes.actions.thresholds.2  Minimum crew needed to take full action complement.
 * @property {number} attributes.actions.thresholds.1  Minimum crew needed to take reduced action complement.
 * @property {number} attributes.actions.thresholds.0  Minimum crew needed to perform any actions.
 * @property {object} attributes.capacity              Information on the vehicle's carrying capacity.
 * @property {string} attributes.capacity.creature     Description of the number of creatures the vehicle can carry.
 * @property {number} attributes.capacity.cargo        Cargo carrying capacity measured in tons.
 * @property {object} traits
 * @property {string} traits.dimensions                Width and length of the vehicle.
 * @property {object} cargo                            Details on this vehicle's crew and cargo capacities.
 * @property {PassengerData[]} cargo.crew              Creatures responsible for operating the vehicle.
 * @property {PassengerData[]} cargo.passengers        Creatures just takin' a ride.
 * @property {SourceData} source                       Adventure or sourcebook where this vehicle originated.
 */
export default class VehicleData extends CommonTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _systemType = "vehicle";

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      vehicleType: new StringField({ required: true, initial: "water", label: "DND5E.VehicleType" }),
      attributes: new SchemaField({
        ...AttributesFields.common,
        ac: new SchemaField({
          ...AttributesFields.armorClass,
          motionless: new StringField({ required: true, label: "DND5E.ArmorClassMotionless" })
        }, { label: "DND5E.ArmorClass" }),
        hp: new SchemaField({
          value: new NumberField({
            nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsCurrent"
          }),
          max: new NumberField({
            nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsMax"
          }),
          temp: new NumberField({ integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp" }),
          tempmax: new NumberField({
            integer: true, initial: 0, label: "DND5E.HitPointsTempMax", hint: "DND5E.HitPointsTempMaxHint"
          }),
          dt: new NumberField({
            required: true, integer: true, min: 0, label: "DND5E.DamageThreshold"
          }),
          mt: new NumberField({
            required: true, integer: true, min: 0, label: "DND5E.VehicleMishapThreshold"
          })
        }, {label: "DND5E.HitPoints"}),
        actions: new SchemaField({
          stations: new BooleanField({ required: true, label: "DND5E.VehicleActionStations" }),
          value: new NumberField({
            required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.VehicleActionMax"
          }),
          thresholds: new SchemaField({
            2: new NumberField({
              required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsFull"
            }),
            1: new NumberField({
              required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsMid"
            }),
            0: new NumberField({
              required: true, integer: true, min: 0, label: "DND5E.VehicleActionThresholdsMin"
            })
          }, {label: "DND5E.VehicleActionThresholds"})
        }, {label: "DND5E.VehicleActions"}),
        capacity: new SchemaField({
          creature: new StringField({ required: true, label: "DND5E.VehicleCreatureCapacity" }),
          cargo: new NumberField({
            required: true, nullable: false, integer: false, initial: 0, min: 0, label: "DND5E.VehicleCargoCapacity"
          })
        }, { label: "DND5E.VehicleCargoCrew" })
      }, { label: "DND5E.Attributes" }),
      details: new SchemaField(DetailsFields.common, { label: "DND5E.Details" }),
      source: new SourceField(),
      traits: new SchemaField({
        ...TraitsFields.common,
        size: new StringField({ required: true, initial: "lg", label: "DND5E.Size" }),
        di: new DamageTraitField({}, { label: "DND5E.DamImm", initialValue: ["poison", "psychic"] }),
        ci: new SimpleTraitField({}, { label: "DND5E.ConImm", initialValue: [
          "blinded", "charmed", "deafened", "frightened", "paralyzed",
          "petrified", "poisoned", "stunned", "unconscious"
        ] }),
        dimensions: new StringField({ required: true, label: "DND5E.Dimensions" })
      }, { label: "DND5E.Traits" }),
      cargo: new SchemaField({
        crew: new ArrayField(makePassengerData(), { label: "DND5E.VehicleCrew" }),
        passengers: new ArrayField(makePassengerData(), { label: "DND5E.VehiclePassengers" })
      }, { label: "DND5E.VehicleCrewPassengers" })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateInitiative(source.attributes);
    VehicleData.#migrateSource(source);
  }

  /* -------------------------------------------- */

  /**
   * Convert source string into custom object & move to top-level.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSource(source) {
    let custom;
    if ( ("details" in source) && ("source" in source.details) ) {
      if ( foundry.utils.getType(source.details?.source) === "string" ) custom = source.details.source;
      else source.source = source.details.source;
    }
    if ( custom ) source.source = { custom };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.attributes.prof = 0;
    this.attributes.ac.calc = "flat";
    AttributesFields.prepareBaseArmorClass.call(this);
    AttributesFields.prepareBaseEncumbrance.call(this);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const { originalSaves } = this.parent.getOriginalStats();

    this.prepareAbilities({ rollData, originalSaves });
    AttributesFields.prepareArmorClass.call(this, rollData);
    AttributesFields.prepareEncumbrance.call(this, rollData, { validateItem: item =>
      (item.flags.dnd5e?.vehicleCargo === true) || !["weapon", "equipment"].includes(item.type)
    });
    AttributesFields.prepareHitPoints.call(this, this.attributes.hp);
    AttributesFields.prepareInitiative.call(this, rollData);
    AttributesFields.prepareMovement.call(this);
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
    TraitsFields.prepareResistImmune.call(this);
    MovementField.prepareData.call(this.attributes.movement, this.schema.getField("attributes.movement"));
  }
}

/* -------------------------------------------- */

/**
 * Data structure for an entry in a vehicle's crew or passenger lists.
 *
 * @typedef {object} PassengerData
 * @property {string} name      Name of individual or type of creature.
 * @property {number} quantity  How many of this creature are onboard?
 */

/**
 * Produce the schema field for a simple trait.
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {PassengerData}
 */
function makePassengerData(schemaOptions={}) {
  return new SchemaField({
    name: new StringField({required: true, label: "DND5E.VehiclePassengerName"}),
    quantity: new NumberField({
      required: true, nullable: false, integer: true, initial: 0, min: 0, label: "DND5E.VehiclePassengerQuantity"
    })
  }, schemaOptions);
}
