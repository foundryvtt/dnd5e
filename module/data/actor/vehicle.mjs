import { convertWeight, defaultUnits, parseDelta } from "../../utils.mjs";
import MovementField from "../shared/movement-field.mjs";
import SourceField from "../shared/source-field.mjs";
import TravelField from "./fields/travel-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CommonTemplate from "./templates/common.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const { ArrayField, BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { PassengerData, VehicleActorSystemData } from "./_types.mjs";
 */

/**
 * System data definition for Vehicles.
 * @extends {CreatureTemplate<VehicleActorSystemData>}
 * @mixes VehicleActorSystemData
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
          ...AttributesFields.hitPoints,
          mt: new NumberField({
            required: true, integer: true, min: 0, label: "DND5E.VEHICLE.Mishap.Threshold.label"
          })
        }, { label: "DND5E.HitPoints" }),
        actions: new SchemaField({
          max: new NumberField({
            required: true, nullable: false, integer: true, initial: 3, min: 0, max: 3,
            label: "DND5E.VEHICLE.FIELDS.attributes.actions.max.label"
          }),
          spent: new NumberField({
            required: true, nullable: false, integer: true, initial: 0, min: 0, max: 3,
            label: "DND5E.VEHICLE.FIELDS.attributes.actions.spent.label"
          }),
          stations: new BooleanField({
            required: true, initial: true, label: "DND5E.VEHICLE.FIELDS.attributes.actions.stations.label"
          }),
          thresholds: new SchemaField({
            2: new NumberField({
              required: true, integer: true, min: 0,
              label: "DND5E.VEHICLE.FIELDS.attributes.actions.thresholds.full.label"
            }),
            1: new NumberField({
              required: true, integer: true, min: 0,
              label: "DND5E.VEHICLE.FIELDS.attributes.actions.thresholds.mid.label"
            }),
            0: new NumberField({
              required: true, integer: true, min: 0,
              label: "DND5E.VEHICLE.FIELDS.attributes.actions.thresholds.min.label"
            })
          }, { label: "DND5E.VEHICLE.FIELDS.attributes.actions.thresholds.label" })
        }, { label: "DND5E.VEHICLE.FIELDS.attributes.actions.label" }),
        capacity: new SchemaField({
          cargo: new SchemaField({
            value: new NumberField({ min: 0, label: "DND5E.VEHICLE.FIELDS.attributes.capacity.cargo.value.label" }),
            units: new StringField({
              required: true, blank: false, label: "DND5E.UNITS.WEIGHT.Label", initial: () => defaultUnits("weight")
            })
          }, { label: "DND5E.VEHICLE.FIELDS.attributes.capacity.cargo.value.label" }),
          creature: new StringField({ required: true, label: "DND5E.VehicleCreatureCapacity" }) // FIXME: Leave in the model until we decide how to migrate it.
        }, { label: "DND5E.VEHICLE.FIELDS.attributes.capacity.label" }),
        price: new SchemaField({
          value: new NumberField({ initial: null, min: 0, label: "DND5E.Price" }),
          denomination: new StringField({ required: true, blank: false, initial: "gp", label: "DND5E.Currency" })
        }, { label: "DND5E.Price" }),
        quality: new SchemaField({
          value: new NumberField({ required: true, nullable: false, integer: true, min: -10, max: 10, initial: 4 })
        }),
        travel: new TravelField({ pace: false, }, {
          initialTime: () => CONFIG.DND5E.travelTimes.vehicle, initialUnits: () => defaultUnits("travel")
        })
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
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateInitiative(source.attributes);
    VehicleData.#migrateSource(source);
    VehicleData.#migrateMovement(source);
    VehicleData.#migrateType(source);
    VehicleData.#migrateCargoCapacity(source);
    VehicleData.#migrateActions(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate actions from value to max.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateActions(source) {
    const actions = source.attributes?.actions;
    if ( !actions || (actions.max !== undefined) || (actions.spent !== undefined) || (actions.value === undefined) ) {
      return;
    }
    actions.max = actions.value;
    delete actions.value;
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
   * Migrate movement speeds to travel pace by taking the previous max speed and assigning it to a movement type
   * based on the vehicle's type.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMovement(source) {
    const movement = source.attributes?.movement;
    const { vehicleType } = source;
    let newUnits;
    if ( movement?.units === "mi" ) newUnits = "mph";
    else if ( movement?.units === "km" ) newUnits = "kph";
    if ( !vehicleType || !movement || !newUnits || !("walk" in movement) || source.attributes?.travel ) return;
    let max = 0;
    for ( const p in CONFIG.DND5E.movementTypes ) {
      if ( movement[p] > max ) max = movement[p];
      delete movement[p];
    }
    source.attributes ??= {};
    source.attributes.travel = {
      [vehicleType === "space" ? "air" : vehicleType]: max,
      units: newUnits
    };
    movement.units = null;
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
      this.attributes.ac.motionless = this.attributes.ac.value - Math.max(0, this.abilities.dex?.mod ?? 0);
    }
    AttributesFields.prepareEncumbrance.call(this, rollData, { validateItem: item => !item.isMountable });
    AttributesFields.prepareHitPoints.call(this, this.attributes.hp);
    AttributesFields.prepareInitiative.call(this, rollData);
    AttributesFields.prepareMovement.call(this, rollData);
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
    TraitsFields.prepareResistImmune.call(this);
    TravelField.prepareData.call(this, rollData);

    const { actions } = this.attributes;
    const crew = this.crew.value.length;

    if ( !actions.stations && actions.max ) {
      for ( let i = actions; i--; actions.max-- ) {
        const threshold = actions.thresholds[i];
        if ( Number.isFinite(threshold) && (crew >= threshold) ) break;
      }
    }

    actions.value = Math.clamp(actions.max - actions.spent, 0, actions.max);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Adjust the crew quantity to some target value.
   * @param {string} area           The crew area.
   * @param {string} uuid           The crew member's UUID.
   * @param {string|number} target  The target value, which may be a delta.
   * @returns {Promise<Actor5e>}    The actor with updates applied.
   */
  async adjustCrew(area, uuid, target) {
    const updates = this.getCrewUpdates(area, uuid, target);
    if ( foundry.utils.isEmpty(updates) ) return this.parent;
    return this.parent.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Compute the update required in order to adjust the crew to some target quantity.
   * @param {string} area          The crew area.
   * @param {string} uuid          The crew member's UUID.
   * @param {string|number} target The target value, which may be a delta.
   * @returns {object}
   */
  getCrewUpdates(area, uuid, target) {
    const roster = this[area].value;
    const quantity = roster.reduce((acc, u) => acc + (u === uuid), 0);
    target = Math.max(0, typeof target === "number" ? target : parseDelta(target, quantity));
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
   * @returns {Promise<{ pct: number, max: number, value: number }>}
   */
  async getEncumbrance() {
    const encumbrance = foundry.utils.deepClone(this.attributes.encumbrance);
    if ( Number.isFinite(encumbrance.max) || !this.draft.value.length ) return encumbrance; // Encumbrance already calculated.
    const { baseUnits, draftMultiplier } = CONFIG.DND5E.encumbrance;
    const unitSystem = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    const units = baseUnits.default[unitSystem];
    encumbrance.max = (await Promise.all(this.draft.value.map(fromUuid))).reduce((n, actor) => {
      const capacity = actor.system.attributes?.encumbrance?.max || 0;
      return n + (capacity * draftMultiplier);
    }, 0);
    const { weight } = this.traits;
    if ( weight.value ) {
      encumbrance.max = Math.max(0, encumbrance.max - convertWeight(weight.value, weight.units, units));
    }
    if ( encumbrance.max ) encumbrance.pct = Math.clamp((encumbrance.value * 100) / encumbrance.max, 0, 100);
    return encumbrance;
  }

  /* -------------------------------------------- */

  /** @override */
  async recoverCombatUses(periods, results) {
    const { actions } = this.attributes;
    if ( !actions.stations && actions.max && (periods.includes("encounter") || periods.includes("turnEnd")) ) {
      results.actor["system.attributes.actions.spent"] = 0;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Whether the given activity should prompt for auto-consumption of a crew action.
   * @param {Activity} activity  The activity.
   * @returns {boolean|void}
   */
  static canConsumeCrewAction(activity) {
    const { actor } = activity;
    return actor?.system.attributes?.actions?.stations === false;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    await TraitsFields.preCreateSize.call(this, data, options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changes, options, user) {
    if ( (await super._preUpdate(changes, options, user)) === false ) return false;
    await AttributesFields.preUpdateHP.call(this, changes, options, user);
    await TraitsFields.preUpdateSize.call(this, changes, options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    AttributesFields.onUpdateHP.call(this, changed, options, userId);
  }
}

/* -------------------------------------------- */

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
