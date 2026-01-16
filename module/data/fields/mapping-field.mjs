/**
 * @import { MappingFieldInitialValueBuilder, MappingFieldOptions } from "./_types.mjs";
 */

const { DataFieldOperator, ForcedDeletion, ForcedReplacement } = foundry.data.operators ?? {};
const { DataField, ObjectField, SchemaField } = foundry.data.fields;
const { DataModelValidationFailure } = foundry.data.validation;

/**
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 *
 * @param {DataField} model                    The class of DataField which should be embedded in this field.
 * @param {MappingFieldOptions} [options={}]   Options which configure the behavior of the field.
 * @property {string[]} [initialKeys]          Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [initialKeysOnly=false]  Should the keys in the initialized data be limited to the keys provided
 *                                              by `options.initialKeys`?
 */
export default class MappingField extends ObjectField {
  constructor(model, options) {
    if ( !(model instanceof DataField) ) {
      throw new Error("MappingField must have a DataField as its contained element");
    }
    super(options);

    /**
     * The embedded DataField definition which is contained in this field.
     * @type {DataField}
     */
    this.model = model;
    model.parent = this;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      initialKeysOnly: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(value, options, _state={}) {
    Object.entries(value).forEach(([k, v]) => {
      if ( k.startsWith("-=") ) return;
      const _innerState = {..._state, source: _state.source?.[k]};
      SchemaField.reconstructOperator?.(value, k, v);
      v = value[k];
      if ( (game.release.generation > 13) && (v instanceof DataFieldOperator) ) {
        if ( v instanceof ForcedReplacement ) {
          const cv = DataFieldOperator.get(v);
          DataFieldOperator.set(v, this.model.clean(cv, {...options, partial: false}, _innerState));
        }
      }
      else value[k] = this.model.clean(v, options, _innerState);
    });
    return value;
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
    const initial = this.model.getInitialValue();
    return this.initialValue?.(key, initial, object) ?? initial;
  }

  /* -------------------------------------------- */

  /** @override */
  _validateType(value, options={}) {
    if ( foundry.utils.getType(value) !== "Object" ) throw new Error("must be an Object");
    const failure = this._validateValues(value, options);
    if ( failure ) {
      const isV13 = game.release.generation < 14;
      const empty = isV13 ? failure.isEmpty() : failure.empty;
      if ( !empty ) {
        if ( isV13 ) throw failure.asError();
        throw failure;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Validate each value of the object.
   * @param {object} value     The object to validate.
   * @param {object} options   Validation options.
   * @returns {DataModelValidationFailure|void}
   */
  _validateValues(value, { phase: _phase, ...options }={}) {
    const isV13 = game.release.generation < 14;
    const failure = new DataModelValidationFailure();
    for ( const [k, v] of Object.entries(value) ) {
      if ( k.startsWith("-=") ) continue;
      if ( (game.release.generation > 13) && (v instanceof ForcedDeletion) ) continue;
      const error = this.model.validate(v, { ...options, strict: false, recursive: true });
      if ( error ) {
        failure.fields[k] = error;
        if ( error.unresolved ) failure.unresolved = true;
      }
    }
    const empty = isV13 ? failure.isEmpty() : failure.empty;
    if ( !empty ) return failure;
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
      obj[key] = this.model.initialize(data, model, options);
    }
    return obj;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getField(path, options) {
    if ( path.length === 0 ) return this;
    else if ( path.length === 1 ) return this.model;
    if ( game.release.generation < 14 ) path.shift();
    else path.pop();
    return this.model._getField(path, options);
  }

  /* -------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData   Candidate source data of the root model
   * @param {any} fieldData       The value of this field within the source data
   */
  migrateSource(sourceData, fieldData) {
    if ( !(this.model.migrateSource instanceof Function) ) return;
    if ( foundry.utils.getType(fieldData) !== "Object" ) return;
    for ( const entry of Object.values(fieldData) ) this.model.migrateSource(sourceData, entry);
  }
}
