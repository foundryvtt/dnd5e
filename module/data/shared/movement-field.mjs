import FormulaField from "../fields/formula-field.mjs";
import MappingField from "../fields/mapping-field.mjs";

const { BooleanField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * @import { TravelPace5e } from "../actor/fields/_types.mjs";
 * @import { MovementData } from "./_types.mjs";
 */

/**
 * Field for storing movement data.
 */
export default class MovementField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    fields = {
      bonus: new FormulaField({ deterministic: true, label: "DND5E.MOVEMENT.FIELDS.bonus.label" }),
      multiplier: new NumberField({
        min: 0, initial: 1, persisted: false, label: "DND5E.MOVEMENT.FIELDS.multiplier.label"
      }),
      special: new StringField({ label: "DND5E.MOVEMENT.FIELDS.special.label" }),
      speeds: new MappingField(new FormulaField({ deterministic: true }), {
        initialKeys: CONFIG.DND5E.movementTypes, initialKeysOnly: true
      }),
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
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /**
   * Default movement types that need to be migrated and shimmed.
   * @type {string[]}
   */
  static #DEFAULT_SPEEDS = ["walk", "burrow", "climb", "fly", "jump", "swim"];

  /* -------------------------------------------- */

  /**
   * Migrate movement types into mapping field.
   * @param {MovementData} [movement]  Movement data object to shim.
   */
  static _migrate(movement) {
    if ( !movement ) return;
    movement.speeds ??= {};
    for ( const key of MovementField.#DEFAULT_SPEEDS ) {
      if ( !(key in movement) || (key in movement.speeds) ) continue;
      movement.speeds[key] = movement[key];
      delete movement[key];
    }
  }

  /* -------------------------------------------- */
  /*  Data Shims                                  */
  /* -------------------------------------------- */

  /**
   * Apply shims to the movement field so old movement locations still work.
   * @param {MovementData} movement  Movement data object to shim.
   */
  static _shim(movement) {
    for ( const key of MovementField.#DEFAULT_SPEEDS ) {
      Object.defineProperty(movement, key, {
        get() {
          return this.speeds[key];
        },
        set(value) {
          foundry.utils.logCompatibilityWarning(`movement.${key} has moved to "movement.speeds.${key}".`, {
            since: "DnD5e 6.0", until: "DnD5e 7.0", once: true
          });
          this.speeds[key] = value;
        },
        enumerable: true
      });
    }
  }
}
