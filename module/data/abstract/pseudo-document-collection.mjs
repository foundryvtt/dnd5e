import UtilityActivity from "../../documents/activity/utility.mjs";
import Advancement from "../../documents/advancement/advancement.mjs";

/**
 * Collection that stores pseudo documents similar to `EmbeddedCollection`.
 */
export default class PseudoDocumentCollection extends Collection {
  constructor(name, parent, sourceData) {
    super();
    Object.defineProperties(this, {
      documentClass: { value: PseudoDocumentCollection.documentClasses[name], writable: false },
      name: { value: name, writable: false },
      _source: { value: sourceData, writable: false }
    });
  }

  /* -------------------------------------------- */

  /**
   * Mapping of collection names to document classes representing the base type.
   * @enum { typeof PseudoDocument}
   */
  static documentClasses = {
    activities: UtilityActivity,
    advancement: Advancement
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The Document implementation used to construct instances within this collection.
   * @type {typeof PseudoDocument}
   */
  documentClass;

  /* -------------------------------------------- */

  /**
   * The Document name of Documents stored in this collection.
   * @returns {string|void}
   */
  get documentName() {
    return this.documentClass?.documentName;
  }

  /* -------------------------------------------- */

  /**
   * A cache of this collection's contents grouped by subtype
   * @type {Record<string, PseudoDocument[]>|null}
   */
  #documentsByType = null;

  /* -------------------------------------------- */

  /**
   * This collection's contents grouped by subtype, lazily (re-)computed as needed.
   * @type {Record<string, PseudoDocument[]>}
   */
  get documentsByType() {
    if ( this.#documentsByType ) return this.#documentsByType;
    const types = Object.fromEntries(Object.keys(this.documentClass.documentConfig).map(t => [t, []]));
    for ( const doc of this.values() ) {
      types[doc._source.type ?? "base"]?.push(doc);
    }
    return this.#documentsByType = types;
  }

  /* -------------------------------------------- */

  /**
   * Has this advancement collection been initialized as a one-time workflow?
   * @type {boolean}
   * @protected
   */
  _initialized = false;

  /* -------------------------------------------- */

  /**
   * Record the set of document ids where the Document was not initialized because of invalid source data
   * @type {Set<string>}
   */
  invalidDocumentIds = new Set();

  /* -------------------------------------------- */

  /**
   * The name of this collection in the parent Document.
   * @type {string}
   */
  name;

  /* -------------------------------------------- */

  /**
   * The parent Document to which this AdvancementCollection instance belongs.
   * @type {Document}
   */
  parent;

  /* -------------------------------------------- */

  /**
   * The source data array from which the embedded collection is created
   * @type {object[]}
   * @public
   */
  _source;

  /* -------------------------------------------- */
  /*  Collection Initialization                   */
  /* -------------------------------------------- */

  /**
   * Initialize the EmbeddedCollection by synchronizing its Document instances with existing _source data.
   * Importantly, this method does not make any modifications to the _source array.
   * It is responsible for creating, updating, or removing Documents from the Collection.
   * @param {DataModel} parent                       Parent containing this collection.
   * @param {DocumentConstructionContext} [options]  Initialization options.
   */
  initialize(model, options={}) {
    this.parent = model;
    this._initialized = false;
    this.#documentsByType = null;

    // Re-initialize all records in source
    const initializedIds = new Set();
    for ( const obj of Object.values(this._source) ) {
      const doc = this._initializeDocument(obj, options);
      if ( doc ) initializedIds.add(doc.id);
    }

    // Remove documents that no longer exist in source
    if ( this.size !== initializedIds.size ) {
      for ( const k of this.keys() ) {
        if ( !initializedIds.has(k) ) this.delete(k, { modifySource: false });
      }
    }
    this._initialized = true;
  }

  /* -------------------------------------------- */

  /**
   * Initialize an embedded document and store it in the collection.
   * The document may already exist, in which case we are reinitializing it with new _source data.
   * The document may not yet exist, in which case we create a new Document instance using the provided source.
   *
   * @param {object} data                            The Document data.
   * @param {DocumentConstructionContext} [options]  Initialization options.
   * @returns {PseudoDocument|null}                  The initialized document or null if no document was initialized.
   * @protected
   */
  _initializeDocument(data, options) {
    let doc = this.get(data._id);

    // Re-initialize an existing document
    if ( doc ) {
      doc._initialize(options);
      return doc;
    }

    // Create a new document
    if ( !data._id ) data._id = randomID(16);
    try {
      doc = this.createDocument(data, options);
      super.set(doc.id, doc);
    } catch(err) {
      this._handleInvalidDocument(data._id, err, options);
      return null;
    }
    return doc;
  }

  /* -------------------------------------------- */

  /**
   * Instantiate a Document for inclusion in the Collection.
   * @param {object} data                            The Document data.
   * @param {DocumentConstructionContext} [context]  Document creation context.
   * @returns {PseudoDocument}
   */
  createDocument(data, context={}) {
    const Class = this.getDocumentClass(data.type);
    if ( !Class ) throw new Error(`type: "${data.type}" is not a valid type for the ${this.documentName} Document class`);
    return new Class(data, { ...context, parent: this.parent });
  }

  /* -------------------------------------------- */

  /**
   * Log warnings or errors when a Document is found to be invalid.
   * @param {string} id                      The invalid Document's ID.
   * @param {Error} err                      The validation error.
   * @param {object} [options]               Options to configure invalid Document handling.
   * @param {boolean} [options.strict=true]  Whether to throw an error or only log a warning.
   * @protected
   */
  _handleInvalidDocument(id, err, { strict=true }={}) {
    const documentName = this.documentClass.documentName;
    const parent = this.parent;
    this.invalidDocumentIds.add(id);

    // Wrap the error with more information
    const uuid = foundry.utils.buildUuid({ id, documentName, parent });
    const msg = `Failed to initialize ${documentName} [${uuid}]:\n${err.message}`;
    const error = new Error(msg, { cause: err });

    if ( strict ) globalThis.logger.error(error);
    else globalThis.logger.warn(error);
    if ( strict ) {
      globalThis.Hooks?.onError(`${this.constructor.name}#_initializeDocument`, error, { id, documentName });
    }
  }

  /* -------------------------------------------- */
  /*  Collection Methods                          */
  /* -------------------------------------------- */

  /**
   * Get a document from the EmbeddedCollection by its ID.
   * @param {string} id                         The ID of the Embedded Document to retrieve.
   * @param {object} [options]                  Additional options to configure retrieval.
   * @param {boolean} [options.strict=false]    Throw an Error if the requested Embedded Document does not exist.
   * @param {boolean} [options.invalid=false]   Allow retrieving an invalid Embedded Document.
   * @returns {PseudoDocument}                  The retrieved document instance, or undefined.
   * @throws {Error}                            If strict is true and the Embedded Document cannot be found.
   */
  get(id, { invalid=false, strict=false }={}) {
    let result = super.get(id);
    if ( !result && invalid ) result = this.getInvalid(id, { strict: false });
    if ( !result && strict ) throw new Error(`${this.constructor.documentName} id [${id}] does not exist in the `
      + `${this.constructor.name} collection.`);
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the necessary document class based on the type.
   * @param {string} type  Document sub-type to find.
   */
  getDocumentClass(type) {
    return this.documentClass?.documentConfig[type]?.documentClass;
  }

  /* ---------------------------------------- */

  /**
   * Add a document to the collection.
   * @param {string} key                           The embedded Document ID.
   * @param {PseudoDocument} value                 The embedded Document instance.
   * @param {object} [options={}]                  Additional options to the set operation.
   * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
   * */
  set(key, value, {modifySource=true, ...options}={}) {
    if ( modifySource ) this._set(key, value, options);
    if ( super.get(key) !== value ) this.#documentsByType = null;
    return super.set(key, value);
  }

  /* -------------------------------------------- */

  /**
   * Modify the underlying source array to include the Document.
   * @param {string} key            The Document ID key.
   * @param {PseudoDocument} value  The Document.
   * @param {object} [options={}]   Additional options to the set operation.
   * @protected
   */
  _set(key, value, options={}) {
    this._source[key] = value._source;
  }

  /* ---------------------------------------- */

  /**
   * Remove a document from the collection.
   * @param {string} key                           The embedded Document ID.
   * @param {object} [options={}]                  Additional options to the delete operation.
   * @param {boolean} [options.modifySource=true]  Whether to modify the collection's source as part of the operation.
   * */
  delete(key, { modifySource=true, ...options }={}) {
    if ( modifySource ) this._delete(key, options);
    const result = super.delete(key);
    if ( result ) this.#documentsByType = null;
    return result;
  }

  /* -------------------------------------------- */

  /**
   * Remove the value from the underlying source array.
   * @param {string} key           The Document ID key.
   * @param {object} [options={}]  Additional options to configure deletion behavior.
   * @protected
   */
  _delete(key, options={}) {
    delete this._source[key];
  }

  /* -------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param {function(*, number, PseudoDocumentCollection): boolean} predicate  The predicate.
   * @returns {boolean}
   */
  every(predicate) {
    return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
  }

  /* ---------------------------------------- */

  /**
   * Obtain a temporary Document instance for a document id which currently has invalid source data.
   * @param {string} id                      A document ID with invalid source data.
   * @param {object} [options]               Additional options to configure retrieval.
   * @param {boolean} [options.strict=true]  Throw an Error if the requested ID is not in the set of invalid IDs for
   *                                         this collection.
   * @returns {PseudoDocument|void}          An in-memory instance for the invalid Document.
   * @throws If strict is true and the requested ID is not in the set of invalid IDs for this collection.
   */
  getInvalid(id, { strict=true }={}) {
    if ( !this.invalidDocumentIds.has(id) ) {
      if ( strict ) throw new Error(`${this.constructor.documentName} id [${id}] is not in the set of invalid ids`);
      return;
    }
    const data = this._source[id];
    const documentClass = this.getDocumentClass(data.type) ?? this.documentClass;
    return documentClass.fromSource(foundry.utils.deepClone(data), { parent: this.parent });
  }

  /* ---------------------------------------- */

  /**
   * Convert the EmbeddedCollection to an record of simple objects.
   * @param {boolean} [source=true]     Draw data for contained Documents from the underlying data source?
   * @returns {Record<string, object>}  The extracted record of primitive objects.
   */
  toObject(source=true) {
    const obj = {};
    for ( const doc of this.values() ) {
      obj[doc._id] = doc.toObject(source);
    }
    return obj;
  }
}
