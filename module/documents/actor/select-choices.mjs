import { sortObjectEntries } from "../../utils.mjs";

/**
 * Object representing a nested set of choices to be displayed in a grouped select list or a trait selector.
 *
 * @typedef {object} SelectChoicesEntry
 * @property {string} label              Label, either pre- or post-localized.
 * @property {boolean} [chosen]          Has this choice been selected?
 * @property {boolean} [sorting=true]    Should this value be sorted? If there are a mixture of this value at
 *                                       a level, unsorted values are listed first followed by sorted values.
 * @property {SelectChoices} [children]  Nested choices.
 */

/**
 * Object with a number of methods for performing actions on a nested set of choices.
 *
 * @param {Object<string, SelectChoicesEntry>} [choices={}]  Initial choices for the object.
 */
export default class SelectChoices {
  constructor(choices={}) {
    const clone = foundry.utils.deepClone(choices);
    for ( const value of Object.values(clone) ) {
      if ( !value.children || (value.children instanceof SelectChoices) ) continue;
      value.category = true;
      value.children = new this.constructor(value.children);
    }
    Object.assign(this, clone);
  }

  /* -------------------------------------------- */

  /**
   * Create a set of available choice keys.
   * @type {Set<string>}
   */
  get set() {
    const set = new Set();
    for ( const [key, choice] of Object.entries(this) ) {
      if ( !choice.children ) set.add(key);
      else choice.children.set.forEach(k => set.add(k));
    }
    return set;
  }

  /* -------------------------------------------- */

  /**
   * Create a clone of this object.
   * @returns {SelectChoices}
   */
  clone() {
    const newData = {};
    for ( const [key, value] of Object.entries(this) ) {
      newData[key] = foundry.utils.deepClone(value);
      if ( value.children ) newData[key].children = value.children.clone();
    }
    const clone = new this.constructor(newData);
    return clone;
  }

  /* -------------------------------------------- */

  /**
   * Merge another SelectOptions object into this one.
   * @param {SelectOptions} other
   * @returns {SelectOptions}
   */
  merge(other) {
    return foundry.utils.mergeObject(this, other);
  }

  /* -------------------------------------------- */

  /**
   * Merge another SelectOptions object into this one, returning a new SelectOptions object.
   * @param {SelectOptions} other
   * @returns {SelectOptions}
   */
  merged(other) {
    return this.clone().merge(other);
  }

  /* -------------------------------------------- */

  /**
   * Internal sorting method.
   * @param {object} lhs
   * @param {object} rhs
   * @returns {number}
   */
  _sort(lhs, rhs) {
    if ( lhs.sorting === false && rhs.sorting === false ) return 0;
    if ( lhs.sorting === false ) return -1;
    if ( rhs.sorting === false ) return 1;
    return lhs.label.localeCompare(rhs.label);
  }

  /* -------------------------------------------- */

  /**
   * Sort the entries using the label.
   * @returns {SelectOptions}
   */
  sort() {
    const sorted = new SelectChoices(sortObjectEntries(this, this._sort));
    for ( const key of Object.keys(this) ) delete this[key];
    this.merge(sorted);
    for ( const entry of Object.values(this) ) {
      if ( entry.children ) entry.children.sort();
    }
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Sort the entries using the label, returning a new SelectOptions object.
   * @returns {SelectOptions}
   */
  sorted() {
    const sorted = new SelectChoices(sortObjectEntries(this, this._sort));
    for ( const entry of Object.values(sorted) ) {
      if ( entry.children ) entry.children = entry.children.sorted();
    }
    return sorted;
  }

  /* -------------------------------------------- */

  /**
   * Filters choices in place to only include the provided keys.
   * @param {Set<string>|SelectChoices} filter   Keys of traits to retain or another SelectOptions object.
   * @returns {SelectChoices}                    This SelectChoices with filter applied.
   */
  filter(filter) {
    if ( filter instanceof SelectChoices ) filter = filter.set;

    for ( const [key, trait] of Object.entries(this) ) {
      // Remove children if direct match and no wildcard for this category present
      const wildcardKey = key.replace(/(:|^)([\w]+)$/, "$1*");
      if ( filter.has(key) && !filter.has(wildcardKey) ) {
        if ( trait.children ) delete trait.children;
      }

      // Check children, remove entry if not children match filter
      else if ( !filter.has(wildcardKey) && !filter.has(`${key}:*`) ) {
        if ( trait.children ) trait.children.filter(filter);
        if ( foundry.utils.isEmpty(trait.children ?? {}) ) delete this[key];
      }
    }

    return this;
  }

  /* -------------------------------------------- */

  /**
   * Filters choices to only include the provided keys, returning a new SelectChoices object.
   * @param {Set<string>|SelectChoices} filter   Keys of traits to retain or another SelectOptions object.
   * @returns {SelectChoices}                    Clone of SelectChoices with filter applied.
   */
  filtered(filter) {
    return this.clone().filter(filter);
  }

  /* -------------------------------------------- */

  /**
   * Removes in place any traits or categories the keys of which are included in the exclusion set.
   * @param {Set<string>} keys  Set of keys to remove from the choices.
   * @returns {SelectChoices}   This SelectChoices with excluded keys removed.
   */
  exclude(keys) {
    for ( const [key, trait] of Object.entries(this) ) {
      if ( keys.has(key) ) delete this[key];
      else if ( trait.children ) trait.children = trait.children.exclude(keys);
    }
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Removes any traits or categories the keys of which are included in the exclusion set, returning a copy.
   * @param {Set<string>} keys  Set of keys to remove from the choices.
   * @returns {SelectChoices}   Clone of SelectChoices with excluded keys removed.
   */
  excluded(keys) {
    return this.clone().exclude(keys);
  }
}
