/**
 * A field that contains a rollable formula.
 * @type {DocumentField}
 */
export const FORMULA_FIELD = {
  type: String,
  required: true,
  nullable: false,
  default: "",
  formula: true,
  deterministic: false
};

/**
 * A field that contains a deterministic formula.
 * @type {DocumentField}
 */
export const DETERMINISTIC_FORMULA_FIELD = {
  type: String,
  required: true,
  nullable: false,
  default: "",
  formula: true,
  deterministic: true,
  validate: d => {
    if ( !Roll ) return true;
    const roll = new Roll(d);
    return roll.isDeterministic;
  },
  validationError: "{name} {field} does not contain a valid formula without dice terms."
};

/**
 * Create a mapping field that allows objects referenced by keys (e.g. an actor's skills).
 * @param {object} options
 * @param {DocumentData} options.type  Type of the objects embedded in the mapping field.
 * @returns {DocumentField}            Created mapping field.
 */
export function mappingField(options) {
  return {
    type: Object,
    required: options.required ?? false,
    nullable: options.nullable ?? true,
    default: options.default || {},
    clean: d => {
      return Object.fromEntries(Object.entries(d).map(([k, e]) => {
        const d = new options.type(e);
        return [k, d.toObject(false)];
      }));
    },
    validate: d => {
      if ( !(d instanceof Object) ) return false;
      return Object.values(d).every(e => {
        const d = new options.type(e);
        return d.validate();
      });
    },
    validationError: `{name} {field} does not contain valid ${options.type.name} entries`
  };
}

/**
 * A non-negative number field which may be used in a Document.
 * @type {DocumentField}
 */
export const NONNEGATIVE_NUMBER_FIELD = {
  type: Number,
  required: false,
  validate: n => Number.isFinite(n) && (n >= 0),
  validationError: '{name} {field} "{value}" does not have an non-negative value'
};

/**
 * A string field that defaults to null to be used in a Document.
 * @type {DocumentField}
 */
export const NULLABLE_STRING = {
  type: String,
  required: true,
  nullable: true,
  clean: v => v ? String(v).trim() : null,
  default: null
};
