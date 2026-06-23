/**
 * Data field that selects the appropriate data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom types that aren't currently loaded.
 */
export default class TypedField extends foundry.data.fields.ObjectField {

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      getModelCallback: null
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static recursive = true;

  /* -------------------------------------------- */

  /**
   * Get the fallback defaults if no data model is found.
   * @param {string} type  Specific type name.
   * @returns {object}
   */
  getDefaults(type) {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Get the DataModel definition for the specified type.
   * @param {string} type              Specific type name.
   * @returns {typeof DataModel|null}  Data model to use while initializing the field.
   */
  getModel(type) {
    return this.getModelCallback?.(type) ?? null;
  }

  /* -------------------------------------------- */

  /** @override */
  _cleanType(value, options, _state) {
    if ( !(typeof value === "object") ) value = {};

    const type = _state.dnd5e?.type ?? value.type ?? _state.source?.type;
    const cls = this.getModel(type);
    if ( cls ) return cls.cleanData(value, options, _state);
    if ( options.partial ) return value;

    // Use the defined defaults
    const defaults = this.getDefaults(type);
    return foundry.utils.mergeObject(defaults, value, { inplace: false });
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options = {}) {
    const cls = this.getModel(options.dnd5e?.type ?? value.type);
    if ( cls ) return new cls(value, { parent: model, ...options });
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------- */

  /** @override */
  _migrate(value, options, _state) {
    const cls = this.getModel(_state.dnd5e?.type ?? value.type ?? _state.source?.type);
    if ( cls ) cls.migrateDataSafe(value);
    return value;
  }
}
