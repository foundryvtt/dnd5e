import { convertLength, convertTravelSpeed, simplifyBonus } from "../../../utils.mjs";
import FormulaField from "../../fields/formula-field.mjs";
import MappingField from "../../fields/mapping-field.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * @typedef {"slow"|"normal"|"fast"} TravelPace5e
 */

/**
 * @typedef {object} TravelData
 * @property {TravelPace5e} [pace]            Current travel pace.
 * @property {Record<string, string>} paces   Formulas for various travel paces per/day.
 * @property {Record<string, string>} speeds  Formulas for various travel speeds per/hour.
 * @property {string} units                   Movement used to measure the various travel speeds.
 */

/**
 * Field for storing travel data.
 */
export default class TravelField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialTime=8, initialUnits=null, ...options }={}) {
    fields = {
      pace: new StringField({
        required: true, blank: false, initial: "normal", choices: () => CONFIG.DND5E.travelPace,
        label: "DND5E.TRAVEL.Label"
      }),
      paces: new MappingField(new FormulaField({ deterministic: true }), {
        initialKeys: CONFIG.DND5E.travelTypes, initialKeysOnly: true
      }),
      speeds: new MappingField(new FormulaField({ deterministic: true }), {
        initialKeys: CONFIG.DND5E.travelTypes, initialKeysOnly: true
      }),
      time: new NumberField({
        positive: true, integer: true, initial: initialTime,
        label: "DND5E.TRAVEL.FIELDS.time.label", hint: "DND5E.TRAVEL.FIELDS.time.hint"
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
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare travel data.
   * @this {ActorDataModel}
   * @param {object} rollData  Actor's roll data.
   */
  static prepareData(rollData) {
    const { movement, travel } = this.attributes;
    const { pace: paceMode, units } = travel;
    Object.defineProperty(travel.paces, "max", { value: 0, writable: true });
    Object.defineProperty(travel.speeds, "max", { value: 0, writable: true });

    const noMovement = this.parent.hasConditionEffect("noMovement");
    const halfMovement = this.parent.hasConditionEffect("halfMovement");
    const multiplier = noMovement ? 0 : halfMovement ? 0.5 : 1;
    for ( const type of Object.keys(travel.speeds) ) {
      let pace = travel.paces[type] = Math.max(0, simplifyBonus(travel.paces[type], rollData)) * multiplier;
      const speed = travel.speeds[type] = Math.max(0, simplifyBonus(travel.speeds[type], rollData)) * multiplier;
      if ( speed && !pace ) pace = travel.paces[type] = speed * travel.time;
      if ( pace && !speed ) travel.speeds[type] = Math.floor(pace / travel.time);
      if ( pace && paceMode ) travel.paces[type] = TravelField.applyPaceMultiplier(
        pace, paceMode, CONFIG.DND5E.travelUnits[units]?.type
      );
      if ( pace > travel.paces.max ) travel.paces.max = pace;
      if ( speed > travel.speeds.max ) travel.speeds.max = speed;
    }

    if ( !movement ) return;
    for ( const [type, { travel: travelType="land" }] of Object.entries(CONFIG.DND5E.movementTypes) ) {
      if ( !movement[type] ) continue;
      const speed = TravelField.convertMovementToTravel(movement[type], movement.units, units);
      const pace = travel.paces[travelType] ||= TravelField.applyPaceMultiplier(
        speed * travel.time, paceMode, CONFIG.DND5E.movementUnits[movement.units]?.type
      );
      travel.speeds[travelType] ||= speed;
      if ( pace > travel.paces.max ) travel.paces.max = pace;
      if ( speed > travel.speeds.max ) travel.speeds.max = speed;
    }
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Apply the pace multiplier based on the current pace mode, taking the special casing for default imperial
   * movement into account.
   * @param {number} value
   * @param {TravelPace5e} pace
   * @param {"imperial"|"metric"} [unitType]
   * @returns {number}
   */
  static applyPaceMultiplier(value, pace, unitType) {
    if ( (unitType === "imperial")
      && (value === CONFIG.DND5E.travelPace.normal.standard)
      && CONFIG.DND5E.travelPace[pace]?.standard ) return CONFIG.DND5E.travelPace[pace].standard;
    return Math.floor(value * (CONFIG.DND5E.travelPace[pace]?.multiplier ?? 1));
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
