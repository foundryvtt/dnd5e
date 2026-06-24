import BaseActivityData from "../activity/base-activity.mjs";
import MappingField from "./mapping-field.mjs";
import TypeDataField5e from "./type-data-field.mjs";

/**
 * Field that stores activities on an item.
 */
export class ActivitiesField extends MappingField {
  constructor(options) {
    super(new TypeDataField5e({
      getModel: type => CONFIG.DND5E.activityTypes[type]?.documentClass
    }), options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options) {
    options = { ...options, clean: { copy: false } };
    const activities = Object.values(super.initialize(value, model, options));
    activities.sort((a, b) => a.sort - b.sort);
    return new ActivityCollection(model, activities);
  }
}

/* -------------------------------------------- */

/**
 * Field that stores activity data and swaps class based on activity type.
 */
export class ActivityField extends TypeDataField5e {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "`ActivityField` has been deprecated in favor of a `TypeDataField5e`.",
      { since: "DnD5e 6.0", until: "DnD5e 6.2" }
    );
    super(...args);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      getModel: type => CONFIG.DND5E.activityTypes[type]?.documentClass
    });
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
