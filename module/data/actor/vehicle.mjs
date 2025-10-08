import { convertWeight, defaultUnits, parseDelta } from "../../utils.mjs";
import MovementField from "../shared/movement-field.mjs";
import SourceField from "../shared/source-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CommonTemplate from "./templates/common.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { SourceData } from "../shared/source-field.mjs"
 * @import { ArmorClassData } from "./templates/attributes.mjs"
 */

/**
 * System data definition for Vehicles.
 *
 * @property {object} attributes
 * @property {ArmorClassData} attributes.ac
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
 * @property {UnitValue5e} attributes.capacity.cargo   Cargo carrying capacity.
 * @property {object} attributes.price
 * @property {number|null} attributes.price.value      The vehicle's cost in the specified denomination.
 * @property {string} attributes.price.denomination    The currency denomination.
 * @property {object} crew
 * @property {number} crew.max                         The maximum crew complement the vehicle supports.
 * @property {string[]} crew.value                     The crew roster.
 * @property {object} draft
 * @property {string[]} draft.value                    The draft animals pulling the vehicle.
 * @property {object} passengers
 * @property {number} passengers.max                   The maximum number of passengers the vehicle supports.
 * @property {string[]} passengers.value               The passenger manifest.
 * @property {object} traits
 * @property {UnitValue5e} traits.beam                 The vehicle's beam length.
 * @property {UnitValue5e} traits.keel                 The vehicle's keel length.
 * @property {UnitValue5e} traits.weight               The vehicle's weight.
 * @property {object} cargo                            Details on this vehicle's crew and cargo capacities.
 * @property {object} details
 * @property {string} details.type                     The type of vehicle as defined in DND5E.vehicleTypes.
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
      attributes: new SchemaField({
        ...AttributesFields.common,
        ac: new SchemaField({
          ...AttributesFields.armorClass,
          calc: new StringField({ initial: "flat", label: "DND5E.ArmorClassCalculation" })
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
            required: true, integer: true, min: 0, label: "DND5E.VEHICLE.Mishap.Threshold.label"
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
          cargo: new SchemaField({
            value: new NumberField({ min: 0, label: "DND5E.VEHICLE.FIELDS.attributes.capacity.cargo.value.label" }),
            units: new StringField({
              required: true, blank: false, label: "DND5E.UNITS.WEIGHT.Label", initial: () => defaultUnits("weight")
            })
          }, { label: "DND5E.VEHICLE.FIELDS.attributes.capacity.cargo.value.label" }),
          creature: new StringField({ required: true, label: "DND5E.VehicleCreatureCapacity" }) // FIXME: Leave in the model until we decide how to migrate it.
        }, { label: "DND5E.VEHICLE.FIELDS.attributes.capacity.label" }),
        movement: new SchemaField({
          land: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementLand"
          }),
          water: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementWater"
          }),
          air: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementAir"
          }),
          units: new StringField({
            required: true, nullable: true, blank: false, label: "DND5E.MovementUnits", initial: defaultUnits("travel")
          })
        }),
        price: new SchemaField({
          value: new NumberField({ initial: null, min: 0, label: "DND5E.Price" }),
          denomination: new StringField({ required: true, blank: false, initial: "gp", label: "DND5E.Currency" })
        }, { label: "DND5E.Price" })
      }, { label: "DND5E.Attributes" }),
      crew: new SchemaField({
        max: new NumberField({ min: 0, integer: true }),
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" }))
      }),
      details: new SchemaField({
        ...DetailsFields.common,
        type: new StringField({ required: true, blank: false, initial: "water", label: "DND5E.VEHICLE.Type.label" })
      }, { label: "DND5E.Details" }),
      draft: new SchemaField({
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" }))
      }),
      passengers: new SchemaField({
        max: new NumberField({ min: 0, integer: true }),
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" }))
      }),
      source: new SourceField(),
      traits: new SchemaField({
        ...TraitsFields.common,
        size: new StringField({ required: true, blank: false, initial: "lg", label: "DND5E.Size" }),
        weight: new SchemaField({
          value: new NumberField({ min: 0, label: "DND5E.Weight" }),
          units: new StringField({
            required: true, blank: false, label: "DND5E.UNITS.WEIGHT.Label", initial: () => defaultUnits("weight")
          })
        }, { label: "DND5E.Weight" }),
        keel: new SchemaField({
          value: new NumberField({ min: 0, label: "DND5E.VEHICLE.FIELDS.traits.keel.value.label" }),
          units: new StringField({
            required: true, blank: false, label: "DND5E.UNITS.DISTANCE.Label", initial: () => defaultUnits("length")
          })
        }),
        beam: new SchemaField({
          value: new NumberField({ min: 0, label: "DND5E.VEHICLE.FIELDS.traits.beam.value.label" }),
          units: new StringField({
            required: true, blank: false, label: "DND5E.UNITS.DISTANCE.Label", initial: () => defaultUnits("length")
          })
        }),
        dimensions: new StringField({ required: true, label: "DND5E.Dimensions" }) // FIXME: Leave in the model until we decide how to migrate it.
      }, { label: "DND5E.Traits" }),
      cargo: new SchemaField({ // FIXME: Leave in the model until we decide how to migrate it.
        crew: new ArrayField(makePassengerData()),
        passengers: new ArrayField(makePassengerData())
      })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateInitiative(source.attributes);
    VehicleData.#migrateSource(source);
    VehicleData.#migrateMovement(source);
    VehicleData.#migrateType(source);
    VehicleData.#migrateCargoCapacity(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate cargo capacity from a number to an object with units.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateCargoCapacity(source) {
    const cargo = source.attributes?.capacity?.cargo;
    if ( typeof cargo !== "number" ) return;
    source.attributes.capacity.cargo = { value: cargo, units: "tn" };
  }

  /* -------------------------------------------- */

  /**
   * Migrate movement speeds by taking the previous max speed and assigning it to a movement type based on the
   * vehicle's type.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMovement(source) {
    const movement = source.attributes?.movement;
    const { vehicleType } = source;
    if ( !vehicleType || !movement || !("walk" in movement) ) return;
    let max = 0;
    for ( const p in CONFIG.DND5E.movementTypes ) {
      if ( movement[p] > max ) max = movement[p];
      delete movement[p];
    }
    movement[vehicleType === "space" ? "air" : vehicleType] = max;
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

  /**
   * Convert vehicle type.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateType(source) {
    if ( !source.vehicleType ) return;
    source.details ??= {};
    if ( source.details.type ) return;
    source.details.type = source.vehicleType;
    delete source.vehicleType;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.attributes.prof = 0;
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
    if ( this.attributes.ac.value ) {
      this.attributes.ac.motionless = this.attributes.ac.value - Math.max(0, this.abilities.dex.mod);
    }
    AttributesFields.prepareEncumbrance.call(this, rollData, { validateItem: item => !item.isMountable });
    AttributesFields.prepareHitPoints.call(this, this.attributes.hp);
    AttributesFields.prepareInitiative.call(this, rollData);
    AttributesFields.prepareMovement.call(this);
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
    TraitsFields.prepareResistImmune.call(this);
    MovementField.prepareData.call(this.attributes.movement, this.schema.getField("attributes.movement"));
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Adjust the crew by some delta.
   * @param {string} area         The crew area.
   * @param {string} uuid         The crew member's UUID.
   * @param {string} delta        The delta.
   * @returns {Promise<Actor5e>}  The actor with updates applied.
   */
  async adjustCrew(area, uuid, delta) {
    const updates = this.getCrewUpdates(area, uuid, delta);
    if ( foundry.utils.isEmpty(updates) ) return this.parent;
    return this.parent.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Compute the update required in order to adjust the crew by some delta.
   * @param {string} area          The crew area.
   * @param {string} uuid          The crew member's UUID.
   * @param {string|number} delta  The delta.
   * @returns {object}
   */
  getCrewUpdates(area, uuid, delta) {
    const roster = this[area].value;
    const quantity = roster.reduce((acc, u) => acc + (u === uuid), 0);
    const target = Math.max(0, typeof delta === "number" ? quantity + delta : parseDelta(delta, quantity));
    const diff = target - quantity;
    const updates = {};
    if ( diff > 0 ) updates[`system.${area}.value`] = roster.concat(Array.fromRange(diff).map(() => uuid));
    else if ( diff < 0 ) {
      let count = quantity;
      const newRoster = [];
      for ( let i = roster.length; i--; ) {
        const u = roster[i];
        if ( (count > target) && (u === uuid) ) count--;
        else newRoster.push(u);
      }
      updates[`system.${area}.value`] = newRoster;
    }
    return updates;
  }

  /* -------------------------------------------- */

  /**
   * Get vehicle encumbrance including draft animals.
   * @returns {Promise<object>}
   */
  async getEncumbrance() {
    const encumbrance = foundry.utils.deepClone(this.attributes.encumbrance);
    if ( Number.isFinite(encumbrance.max) ) return encumbrance; // Encumbrance already calculated.
    const { baseUnits, draftMultiplier } = CONFIG.DND5E.encumbrance;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    const units = baseUnits.default[unitSystem];
    encumbrance.max = (await Promise.all(this.draft.value.map(fromUuid))).reduce((n, actor) => {
      const capacity = actor.system.attributes?.encumbrance?.max || 0;
      return n + (capacity * draftMultiplier);
    }, 0);
    const { weight } = this.traits;
    encumbrance.max = Math.max(0, encumbrance.max - convertWeight(weight.value, weight.units, units));
    return encumbrance;
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
    name: new StringField({required: true}),
    quantity: new NumberField({
      required: true, nullable: false, integer: true, initial: 0, min: 0
    })
  }, schemaOptions);
}
