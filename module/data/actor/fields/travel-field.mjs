import { convertLength, convertTravelSpeed, simplifyBonus } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";

const { StringField } = foundry.data.fields;

/**
 * @typedef {"slow"|"normal"|"fast"} TravelPace5e
 */

/**
 * @typedef {object} TravelData
 * @property {TravelPace5e} [pace]            Current travel pace.
 * @property {Record<string, string>} speeds  Formulas for various travel speeds.
 * @property {string} units                   Movement used to measure the various travel speeds.
 */

/**
 * Field for storing travel data.
 */
export default class TravelField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    fields = {
      pace: new StringField({
        required: true, blank: false, initial: "normal", choices: () => CONFIG.DND5E.travelPace,
        label: "DND5E.Travel.Label"
      }),
      speeds: new MappingField(new FormulaField({ deterministic: true }), {
        initialKeys: CONFIG.DND5E.travelTypes, initialKeysOnly: true
      }),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.UNITS.TRAVEL.Label"
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }

  /* -------------------------------------------- */

  /**
   * Number of hours of travel per day.
   * @type {number}
   */
  static #HOURS_PER_DAY = 8; // TODO: Allow this to be configured

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare travel data.
   * @this {ActorDataModel}
   * @param {object} rollData  Actor's roll data.
   */
  static prepareData(rollData) {
    const { movement, travel } = this.attributes;
    const { pace, units } = travel;
    travel.paces = {};
    travel.max = 0;

    const noMovement = this.parent.hasConditionEffect("noMovement");
    const halfMovement = this.parent.hasConditionEffect("halfMovement");
    for ( const type of Object.keys(travel.speeds) ) {
      let speed = Math.max(0, simplifyBonus(travel.speeds[type], rollData));
      if ( noMovement ) speed = 0;
      else if ( halfMovement ) speed *= 0.5;
      travel.speeds[type] = speed;
      if ( speed > travel.max ) travel.max = speed;
      if ( speed ) travel.paces[type] = TravelField.convertSpeedToPace(speed, pace);
    }

    if ( !movement ) return;
    for ( const [type, { travel: travelType="land" }] of Object.entries(CONFIG.DND5E.movementTypes) ) {
      if ( !movement[type] || travel.speeds[travelType] ) continue;
      const speed = TravelField.convertMovementToTravel(movement[type], movement.units, units);
      const travelPace = TravelField.convertSpeedToPace(speed, pace, movement.units);
      travel.paces[travelType] = Math.max(travelPace, travel.paces[travelType] ?? -Infinity);
      travel.speeds[travelType] = speed;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Convert combat movement speed in feet or meters to travel speed in mph or km/h.
   * @param {number} value
   * @param {string} initialUnit
   * @param {string} finalUnit
   * @returns {number}
   */
  static convertMovementToTravel(value, initialUnit, finalUnit) {
    const fromConfig = CONFIG.DND5E.movementUnits[initialUnit];
    const toConfig = CONFIG.DND5E.movementUnits[finalUnit];
    if ( (fromConfig?.type === "metric") && (toConfig?.type === "metric") ) {
      value = convertLength(value, initialUnit, "m", { strict: false });
      return convertTravelSpeed(value / 2, "kph", { strict: false, to: finalUnit }).value;
    } else {
      value = convertLength(value, initialUnit, "ft", { strict: false });
      return convertTravelSpeed(value / 10, "mph", { strict: false, to: finalUnit }).value;
    }
  }

  /* -------------------------------------------- */

  /**
   * Convert travel speed per hour to travel pace per day based on the current pace.
   * @param {number} speed
   * @param {string} pace
   * @param {string} [unit]
   * @returns {number}
   */
  static convertSpeedToPace(speed, pace, unit) {
    const perDay = speed * TravelField.#HOURS_PER_DAY;
    const unitConfig = CONFIG.DND5E.movementUnits[unit] ?? CONFIG.DND5E.travelUnits[unit];
    if ( (CONFIG.DND5E.movementUnits[unit]?.type === "imperial")
      && (perDay === CONFIG.DND5E.travelPace.normal.standard)
      && CONFIG.DND5E.travelPace[pace]?.standard ) return CONFIG.DND5E.travelPace[pace].standard;
    return Math.floor(perDay * (CONFIG.DND5E.travelPace[pace]?.multiplier ?? 1));
  }

  /* -------------------------------------------- */

  /**
   * Apply rules for travel pace to the given skill.
   * @param {TravelPace5e} pace  The travel pace.
   * @param {string} skill       The skill.
   * @returns {{ advantage: boolean, disadvantage: boolean }}
   */
  static getTravelPaceMode(pace, skill) {
    const config = CONFIG.DND5E.skills[skill];
    return {
      advantage: config?.pace?.advantage?.has(pace) ?? false,
      disadvantage: config?.pace?.disadvantage?.has(pace) ?? false
    };
  }
}
