import MappingField from "../fields/mapping-field.mjs";

const { NumberField, StringField } = foundry.data.fields;

/**
 * Field for storing senses data.
 */
export default class SensesField extends foundry.data.fields.SchemaField {
  constructor(fields={}, { initialUnits=null, ...options }={}) {
    fields = {
      ranges: new MappingField(
        new NumberField({ required: true, nullable: true, integer: true, min: 0, initial: null }),
        { initialKeys: CONFIG.DND5E.senses, initialKeysOnly: true }
      ),
      units: new StringField({
        required: true, nullable: true, blank: false, initial: initialUnits, label: "DND5E.SenseUnits"
      }),
      special: new StringField({ required: true, label: "DND5E.SenseSpecial" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, { label: "DND5E.Senses", ...options });
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Default senses that need to be migrated and shimmed.
   * @type {string[]}
   */
  static #DEFAULT_SENSES = ["darkvision", "blindsight", "tremorsense", "truesight"];

  /* -------------------------------------------- */

  /**
   * Migrate senses into mapping field.
   * @param {SensesData} [senses]  Senses data object to shim.
   */
  static _migrate(senses) {
    if ( !senses ) return;
    senses.ranges ??= {};
    for ( const key of SensesField.#DEFAULT_SENSES ) {
      if ( !(key in senses) || (key in senses.ranges) ) continue;
      senses.ranges ??= {};
      senses.ranges[key] = senses[key];
      delete senses[key];
    }
  }

  /* -------------------------------------------- */
  /*  Data Shims                                  */
  /* -------------------------------------------- */

  /**
   * Apply shims to the senses field so old sense locations still work.
   * @param {SensesData} senses  Senses data object to shim.
   */
  static _shim(senses) {
    for ( const key of SensesField.#DEFAULT_SENSES ) {
      Object.defineProperty(senses, key, {
        get() {
          foundry.utils.logCompatibilityWarning(`senses.${key} has moved to "senses.ranges.${key}".`, {
            since: "DnD5e 5.3", until: "DnD5e 6.0"
          });
          return this.ranges[key];
        },
        set(value) {
          foundry.utils.logCompatibilityWarning(`senses.${key} has moved to "senses.ranges.${key}".`, {
            since: "DnD5e 5.3", until: "DnD5e 6.0"
          });
          this.ranges[key] = value;
        },
        enumerable: true
      });
    }
  }
}
