/**
 * Data field that selects the appropriate advancement data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom advancement types that aren't currently loaded.
 */
export default class AdvancementField extends foundry.data.fields.ObjectField {

  /**
   * Get the BaseAdvancement definition for the specified advancement type.
   * @param {string} type                    The Advancement type.
   * @returns {typeof BaseAdvancement|null}  The BaseAdvancement class, or null.
   */
  getModelForType(type) {
    return CONFIG.DND5E.advancementTypes[type]?.documentClass ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(value, options, _state) {
    if ( !(typeof value === "object") ) value = {};

    const cls = this.getModelForType(value.type ?? _state?.source?.type);
    if ( cls ) return cls.cleanData(value, options, _state);
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    const cls = this.getModelForType(value.type);
    if ( cls ) return new cls(value, {parent: model, ...options});
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _migrate(value, options, _state) {
    const cls = this.getModelForType(value.type);
    if ( cls ) cls.migrateDataSafe(value);
    return value;
  }
}

/**
 * @deprecated
 * @since 5.3.0
 */
if ( !("_migrate" in foundry.data.fields.DataField.prototype) ) {
  /** @ignore */
  AdvancementField.prototype.migrateSource = function(sourceData, fieldData) {
    const cls = this.getModelForType(fieldData.type);
    if ( cls ) cls.migrateDataSafe(fieldData);
  };
}
