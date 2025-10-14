import { convertLength } from "../../utils.mjs";

const { BooleanField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * @typedef {"slow"|"normal"|"fast"} TravelPace5e
 */

/**
 * @typedef {object} MovementData
 * @property {number} burrow                        Actor burrowing speed.
 * @property {number} climb                         Actor climbing speed.
 * @property {number} fly                           Actor flying speed.
 * @property {number} swim                          Actor swimming speed.
 * @property {number} walk                          Actor walking speed.
 * @property {string} special                       Semi-colon separated list of special movement information.
 * @property {string} units                         Movement used to measure the various speeds.
 * @property {boolean} hover                        This flying creature able to hover in place.
 * @property {Set<string>} ignoredDifficultTerrain  Types of difficult terrain ignored.
 */

/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    const numberConfig = { required: true, nullable: true, min: 0, step: 0.1, initial: null };
    fields = {
      burrow: new NumberField({ ...numberConfig, label: "DND5E.MOVEMENT.Type.Burrow", speed: true }),
      climb: new NumberField({ ...numberConfig, label: "DND5E.MOVEMENT.Type.Climb", speed: true }),
      fly: new NumberField({ ...numberConfig, label: "DND5E.MOVEMENT.Type.Fly", speed: true }),
      swim: new NumberField({ ...numberConfig, label: "DND5E.MOVEMENT.Type.Swim", speed: true }),
      walk: new NumberField({ ...numberConfig, label: "DND5E.MOVEMENT.Type.Walk", speed: true }),
      special: new StringField({ label: "DND5E.MOVEMENT.FIELDS.special.label" }),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.MOVEMENT.FIELDS.units.label"
      }),
      hover: new BooleanField({ required: true, label: "DND5E.MOVEMENT.Hover" }),
      ignoredDifficultTerrain: new SetField(new StringField(), {
        label: "DND5E.MOVEMENT.FIELDS.ignoredDifficultTerrain.label"
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Movement", ...options });
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

  /* -------------------------------------------- */

  /**
   * Prepare movement data.
   * @this {MovementData}
   * @param {DataField} field  The movement field.
   */
  static prepareData(field) {
    this.paces = {};
    this.max = 0;
    const { pace, units } = this;
    const paceConfig = CONFIG.DND5E.travelPace[pace];
    const unitConfig = CONFIG.DND5E.movementUnits[units];
    if ( !unitConfig ) return;
    Object.entries(this).forEach(([k, v]) => {
      if ( !field.getField(k)?.options.speed ) return;
      if ( v > this.max ) this.max = v;
      let perDay = v;
      if ( unitConfig.travelResolution === "round" ) {
        const inFeet = convertLength(v, units, "ft");
        perDay = Math.round(inFeet * .8);
      }
      if ( pace ) {
        const isStandard = (unitConfig.type === "imperial") && (perDay === CONFIG.DND5E.travelPace.normal.standard);
        if ( isStandard ) this.paces[k] = paceConfig?.standard ?? perDay;
        else this.paces[k] = Math.floor(perDay * (paceConfig?.multiplier ?? 1));
      }
      else this.paces[k] = perDay;
    });
  }
}
