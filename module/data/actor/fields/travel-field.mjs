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
    const numberConfig = { required: true, nullable: true, min: 0, step: 0.1, initial: null };
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

  /* -------------------------------------------- */

  /**
   * Prepare travel data.
   * @this {TravelData}
   * @param {object} rollData          Actor's roll data.
   * @param {MovementData} [movement]  Actor's movement data if available.
   */
  static prepareData(rollData, movement) {
    this.paces = {};
    this.max = 0;
    const { pace, units } = this;
    const noMovement = this.parent?.parent?.hasConditionEffect("noMovement");
    const halfMovement = this.parent?.parent?.hasConditionEffect("halfMovement");
    const paceConfig = CONFIG.DND5E.travelPace[pace];
    for ( const type of Object.keys(this.speeds) ) {
      let speed = Math.max(0, simplifyBonus(this.speeds[type], rollData));
      if ( noMovement ) speed = 0;
      else if ( halfMovement ) speed *= 0.5;
      this.speeds[type] = speed;
      if ( speed > this.max ) this.max = speed;
      if ( speed ) this.paces[type] = TravelField.convertSpeedToPace(speed, pace);
    }

    if ( !movement ) return;
    for ( const [type, { travel="land" }] of Object.entries(CONFIG.DND5E.movementTypes) ) {
      if ( !movement[type] || this.speeds[travel] ) continue;
      const speed = TravelField.convertMovementToTravel(movement[type], movement.units, units);
      const travelPace = TravelField.convertSpeedToPace(speed, pace, movement.units);
      this.paces[travel] = Math.max(travelPace, this.paces[travel] ?? -Infinity);
    }
  }

  /* -------------------------------------------- */

  /**
   * Convert combat movement speed in feet or meters to travel speed in mph or km/h.
   * @param {number} value
   * @param {string} initialUnit
   * @param {string} finalUnit
   * @returns {number}
   */
  static convertMovementToTravel(value, initialUnit, finalUnit) {
    value = convertLength(value, initialUnit, "ft", { strict: false });
    return convertTravelSpeed(value / 10, "mph", { strict: false, to: finalUnit }).value;
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
    if ( (CONFIG.DND5E.movementUnits[unit]?.type === "imperial")
      && (perDay === CONFIG.DND5E.travelPace.normal.standard)
      && CONFIG.DND5E.travelPace[pace]?.standard ) return CONFIG.DND5E.travelPace[pace].standard;
    return Math.floor(perDay * (CONFIG.DND5E.travelPace[pace]?.multiplier ?? 1));
  }
}
