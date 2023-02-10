/**
 * Data field that selects the appropriate advancement data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom advancement types that aren't currently loaded.
 */
export class AdvancementField extends foundry.data.fields.ObjectField {

  /**
   * Get the BaseAdvancement definition for the specified advancement type.
   * @param {string} type                    The Advancement type.
   * @returns {typeof BaseAdvancement|null}  The BaseAdvancement class, or null.
   */
  getModelForType(type) {
    return CONFIG.DND5E.advancementTypes[type] ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    const cls = this.getModelForType(value.type);
    if ( cls ) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options={}) {
    const cls = this.getModelForType(value.type);
    if ( cls ) return new cls(value, {parent: model, ...options});
    return foundry.utils.deepClone(value);
  }
}

/* -------------------------------------------- */

/**
 * Data field that automatically selects the Advancement-specific configuration or value data models.
 *
 * @param {Advancement} advancementType  Advancement class to which this field belongs.
 */
export class AdvancementDataField extends foundry.data.fields.ObjectField {
  constructor(advancementType, options={}) {
    super(options);
    this.advancementType = advancementType;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    // Use a defined DataModel
    const cls = this.getModel();
    if ( cls ) return cls.cleanData(value, options);
    if ( options.partial ) return value;

    // Use the defined defaults
    const defaults = this.getDefaults();
    return foundry.utils.mergeObject(defaults, value, {inplace: false});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options={}) {
    const cls = this.getModel();
    if ( cls ) return new cls(value, {parent: model, ...options});
    return foundry.utils.deepClone(value);
  }
}

/* -------------------------------------------- */

/**
 * @typedef {StringFieldOptions} FormulaFieldOptions
 * @property {boolean} [deterministic=false]  Is this formula not allowed to have dice values?
 */

/**
 * Special case StringField which represents a formula.
 *
 * @param {FormulaFieldOptions} [options={}]  Options which configure the behavior of the field.
 * @property {boolean} deterministic=false    Is this formula not allowed to have dice values?
 */
export class FormulaField extends foundry.data.fields.StringField {

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      deterministic: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _validateType(value) {
    if ( this.options.deterministic ) {
      const roll = new Roll(value);
      if ( !roll.isDeterministic ) throw new Error("must not contain dice terms");
      Roll.safeEval(roll.formula);
    }
    else Roll.validate(value);
    super._validateType(value);
  }
}

/* -------------------------------------------- */

/**
 * Special case StringField that includes automatic validation for identifiers.
 */
export class IdentifierField extends foundry.data.fields.StringField {
  /** @override */
  _validateType(value) {
    if ( !dnd5e.utils.validators.isValidIdentifier(value) ) {
      throw new Error(game.i18n.localize("DND5E.IdentifierError"));
    }
  }
}

/* -------------------------------------------- */

/**
 * @callback MappingFieldInitialValueBuilder
 * @param {string} key       The key within the object where this new value is being generated.
 * @param {*} initial        The generic initial data provided by the contained model.
 * @param {object} existing  Any existing mapping data.
 * @returns {object}         Value to use as default for this key.
 */

/**
 * @typedef {DataFieldOptions} MappingFieldOptions
 * @property {string[]} [initialKeys]       Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [prepareKeys=false]  Should the keys in the initialized data be limited to the keys provided
 *                                          by `options.initialKeys`?
 */

/**
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 *
 * @param {DataField} model                    The class of DataField which should be embedded in this field.
 * @param {MappingFieldOptions} [options={}]   Options which configure the behavior of the field.
 * @property {string[]} [initialKeys]          Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [prepareKeys=false]     Should the keys in the initialized data be limited to the keys provided
 *                                             by `options.initialKeys`?
 */
export class MappingField extends foundry.data.fields.ObjectField {
  constructor(model, options) {
    if ( !(model instanceof foundry.data.fields.DataField) ) {
      throw new Error("MappingField must have a DataField as its contained element");
    }
    super(options);

    /**
     * The embedded DataField definition which is contained in this field.
     * @type {DataField}
     */
    this.model = model;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      prepareKeys: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _cleanType(value, options) {
    Object.entries(value).forEach(([k, v]) => value[k] = this.model.clean(v, options));
    return value;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
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
    const errors = this._validateValues(value, options);
    if ( !foundry.utils.isEmpty(errors) ) throw new foundry.data.fields.ModelValidationError(errors);
  }

  /* -------------------------------------------- */

  /**
   * Validate each value of the object.
   * @param {object} value     The object to validate.
   * @param {object} options   Validation options.
   * @returns {Object<Error>}  An object of value-specific errors by key.
   */
  _validateValues(value, options) {
    const errors = {};
    for ( const [k, v] of Object.entries(value) ) {
      const error = this.model.validate(v, options);
      if ( error ) errors[k] = error;
    }
    return errors;
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    if ( !value ) return value;
    const obj = {};
    const initialKeys = (this.initialKeys instanceof Array) ? this.initialKeys : Object.keys(this.initialKeys ?? {});
    const keys = this.prepareKeys ? initialKeys : Object.keys(value);
    for ( const key of keys ) {
      const data = value[key] ?? this._getInitialValueForKey(key, value);
      obj[key] = this.model.initialize(data, model, options);
    }
    return obj;
  }
}
