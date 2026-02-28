/**
 * Data field that automatically selects the Advancement-specific configuration or value data models.
 *
 * @param {Advancement} advancementType  Advancement class to which this field belongs.
 */
export default class AdvancementDataField extends foundry.data.fields.ObjectField {
  constructor(advancementType, options={}) {
    super(options);
    this.advancementType = advancementType;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {required: true});
  }

  /**
   * Get the DataModel definition for the specified field as defined in metadata.
   * @returns {typeof DataModel|null}  The DataModel class, or null.
   */
  getModel() {
    return this.advancementType.metadata?.dataModels?.[this.name];
  }

  /* -------------------------------------------- */

  /**
   * Get the defaults object for the specified field as defined in metadata.
   * @returns {object}
   */
  getDefaults() {
    return this.advancementType.metadata?.defaults?.[this.name] ?? {};
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(value, options, _state) {
    if ( !(typeof value === "object") ) value = {};

    // Use a defined DataModel
    const cls = this.getModel();
    if ( cls ) return cls.cleanData(value, options, _state);
    if ( options.partial ) return value;

    // Use the defined defaults
    const defaults = this.getDefaults();
    return foundry.utils.mergeObject(defaults, value, {inplace: false});
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    const cls = this.getModel();
    if ( cls ) return new cls(value, {parent: model, ...options});
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _migrate(value, options, _state) {
    const cls = this.getModel();
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
  AdvancementDataField.prototype.migrateSource = function(sourceData, fieldData) {
    const cls = this.getModel();
    if ( cls ) cls.migrateDataSafe(fieldData);
  };
}
