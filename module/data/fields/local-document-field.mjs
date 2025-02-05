/**
 * @typedef {StringFieldOptions} LocalDocumentFieldOptions
 * @property {boolean} [fallback=false]  Display the string value if no matching item is found.
 */

/**
 * A mirror of ForeignDocumentField that references a Document embedded within this Document.
 *
 * @param {typeof Document} model              The local DataModel class definition which this field should link to.
 * @param {LocalDocumentFieldOptions} options  Options which configure the behavior of the field.
 */
export default class LocalDocumentField extends foundry.data.fields.DocumentIdField {
  constructor(model, options={}) {
    if ( !foundry.utils.isSubclass(model, foundry.abstract.DataModel) ) {
      throw new Error("A ForeignDocumentField must specify a DataModel subclass as its type");
    }

    super(options);
    this.model = model;
  }

  /* -------------------------------------------- */

  /**
   * A reference to the model class which is stored in this field.
   * @type {typeof Document}
   */
  model;

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      nullable: true,
      readonly: false,
      idOnly: false,
      fallback: false
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _cast(value) {
    if ( typeof value === "string" ) return value;
    if ( (value instanceof this.model) ) return value._id;
    throw new Error(`The value provided to a LocalDocumentField must be a ${this.model.name} instance.`);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _validateType(value) {
    if ( !this.options.fallback ) super._validateType(value);
  }

  /* -------------------------------------------- */

  /**
   * Step up through model's parents to find the specified collection.
   * @param {DataModel} model
   * @param {string} collection
   * @returns {EmbeddedCollection|void}
   */
  _findCollection(model, collection) {
    if ( !model.parent ) return;
    try {
      return model.parent.getEmbeddedCollection(collection);
    } catch(err) {
      return model.parent[collection] ?? this._findCollection(model.parent, collection);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options={}) {
    if ( this.idOnly ) return this.options.fallback || foundry.data.validators.isValidId(value) ? value : null;
    const collection = this._findCollection(model, this.model.metadata.collection);
    return () => {
      const document = collection?.get(value);
      if ( !document ) return this.options.fallback ? value : null;
      if ( this.options.fallback ) Object.defineProperty(document, "toString", {
        value: () => document.name,
        configurable: true,
        enumerable: false
      });
      return document;
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  toObject(value) {
    return value?._id ?? value;
  }
}
