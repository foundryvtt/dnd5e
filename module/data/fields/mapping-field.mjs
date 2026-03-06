/**
 * @import { MappingFieldEntryLabelBuilder, MappingFieldInitialValueBuilder, MappingFieldOptions } from "./_types.mjs";
 */

const { DataField } = foundry.data.fields;

/**
 * A subclass of TypedObjectField that represents a mapping of keys to the provided DataField type.
 *
 * @param {DataField} model                    The class of DataField which should be embedded in this field.
 * @param {MappingFieldOptions} [options={}]   Options which configure the behavior of the field.
 * @property {string[]} [initialKeys]          Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {MappingFieldEntryLabelBuilder} [entryLabel]      Function to calculate the label for a key.
 * @property {boolean} [initialKeysOnly=false]  Should the keys in the initialized data be limited to the keys provided
 *                                              by `options.initialKeys`?
 */
export default class MappingField extends foundry.data.fields.TypedObjectField {
  constructor(model, options, context) {
    if ( !(model instanceof DataField) ) {
      throw new Error("MappingField must have a DataField as its contained element");
    }
    super(model, options, context);

    /**
     * The embedded DataField definition which is contained in this field.
     * @type {DataField}
     */
    this.model = this.element;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      initialKeysOnly: false,
      entryLabel: null,
      expandKeys: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getInitialValue(data) {
    let keys = this.initialKeys;
    const initial = super.getInitialValue(data);
    if ( !keys || !foundry.utils.isEmpty(initial) ) return initial;
    if ( !(keys instanceof Array) ) keys = Object.keys(keys);
    for ( const key of keys ) initial[key] = this._getInitialValueForKey(key);
    return initial;
  }

  /* -------------------------------------------- */

  /**
   * Get the initial value for the provided key.
   * @param {string} key       Key within the object being built.
   * @param {object} [object]  Any existing mapping data.
   * @returns {*}              Initial value based on provided field type.
   */
  _getInitialValueForKey(key, object) {
    const initial = this.element.getInitialValue();
    return this.initialValue?.(key, initial, object) ?? initial;
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    if ( !value ) return value;
    const obj = {};
    const initialKeys = (this.initialKeys instanceof Array) ? this.initialKeys : Object.keys(this.initialKeys ?? {});
    const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
    for ( const key of keys ) {
      const data = value[key] ?? this._getInitialValueForKey(key, value);
      obj[key] = this.element.initialize(data, model, options);
    }
    return obj;
  }

  /* -------------------------------------------- */

  /** @override */
  _getField(path, options={}) {
    if ( path.length === 0 ) return this;
    if ( game.release.generation < 14 ) path.shift();
    else path.pop();
    return this.element._getField(path, options);
  }

  /* -------------------------------------------- */

  /**
   * Get the formatted label for the specified field within the element of the provided key.
   * @param {string} key     Key of the entry listing in the `MappingField` (e.g. `dex`, `str`).
   * @param {string[]} path  Path parts to a field within the field's element (e.g. `["mode", "roll", "save"]`).
   * @returns {string|void}  Formatted name for the field if a formatter is provided. Falls back to the field's generic
   *                         label if no formatter is provided, or nothing if field isn't found or it isn't labeled.
   */
  getFieldLabel(key, path) {
    const field = this.element._getField(path);
    if ( !field ) return;
    const name = this.entryLabel?.(key);
    if ( !field.options.labelFormatter || !name ) return field.label;
    return game.i18n.format(field.options.labelFormatter, { name });
  }
}
