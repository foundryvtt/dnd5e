import BaseActivityData from "../activity/base-activity.mjs";
import MappingField from "./mapping-field.mjs";

/**
 * Field that stores activities on an item.
 */
export class ActivitiesField extends MappingField {
  constructor(options) {
    super(new ActivityField(), options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options) {
    const activities = Object.values(super.initialize(value, model, options));
    activities.sort((a, b) => a.sort - b.sort);
    return new ActivityCollection(model, activities);
  }
}

/* -------------------------------------------- */

/**
 * Field that stores activity data and swaps class based on activity type.
 */
export class ActivityField extends foundry.data.fields.ObjectField {

  /** @override */
  static recursive = true;

  /* -------------------------------------------- */

  /**
   * Get the document type for this activity.
   * @param {object} value            Activity data being prepared.
   * @returns {typeof Activity|null}  Activity document type.
   */
  getModel(value) {
    return CONFIG.DND5E.activityTypes[value.type]?.documentClass ?? null;
  }

  /* -------------------------------------------- */

  /** @override */
  _cleanType(value, options) {
    if ( !(typeof value === "object") ) value = {};

    const cls = this.getModel(value);
    if ( cls ) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  initialize(value, model, options = {}) {
    const cls = this.getModel(value);
    if ( cls ) return new cls(value, { parent: model, ...options });
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData  Candidate source data of the root model.
   * @param {any} fieldData      The value of this field within the source data.
   */
  migrateSource(sourceData, fieldData) {
    const cls = this.getModel(fieldData);
    if ( cls ) cls.migrateDataSafe(fieldData);
  }
}

/* -------------------------------------------- */

/**
 * Specialized collection type for stored activities.
 * @param {DataModel} model     The parent DataModel to which this ActivityCollection belongs.
 * @param {Activity[]} entries  The activities to store.
 */
export class ActivityCollection extends Collection {
  constructor(model, entries) {
    super();
    this.#model = model;
    for ( const entry of entries ) {
      if ( !(entry instanceof BaseActivityData) ) continue;
      this.set(entry._id, entry);
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The parent DataModel to which this ActivityCollection belongs.
   * @type {DataModel}
   */
  #model;

  /* -------------------------------------------- */

  /**
   * Pre-organized arrays of activities by type.
   * @type {Map<string, Set<string>>}
   */
  #types = new Map();

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Fetch an array of activities of a certain type.
   * @param {string} type  Activity type.
   * @returns {Activity[]}
   */
  getByType(type) {
    return Array.from(this.#types.get(type) ?? []).map(key => this.get(key));
  }

  /* -------------------------------------------- */

  /**
   * Generator that yields activities for each of the provided types.
   * @param {string[]} types  Types to fetch.
   * @yields {Activity}
   */
  *getByTypes(...types) {
    for ( const type of types ) {
      for ( const activity of this.getByType(type) ) yield activity;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  set(key, value) {
    if ( !this.#types.has(value.type) ) this.#types.set(value.type, new Set());
    this.#types.get(value.type).add(key);
    return super.set(key, value);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  delete(key) {
    this.#types.get(this.get(key)?.type)?.delete(key);
    return super.delete(key);
  }

  /* -------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param {function(*, number, ActivityCollection): boolean} predicate  The predicate.
   * @returns {boolean}
   */
  every(predicate) {
    return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
  }

  /* -------------------------------------------- */

  /**
   * Convert the ActivityCollection to an array of simple objects.
   * @param {boolean} [source=true]  Draw data for contained Documents from the underlying data source?
   * @returns {object[]}             The extracted array of primitive objects.
   */
  toObject(source=true) {
    return this.map(doc => doc.toObject(source));
  }
}
