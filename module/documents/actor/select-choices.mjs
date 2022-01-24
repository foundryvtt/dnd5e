/**
 * Object representing a nested set of choices to be displayed in a grouped select list or a trait selector.
 *
 * @typedef {object} SelectChoicesEntry
 * @property {string} label              Label, either pre- or post-localized.
 * @property {boolean} [chosen]          Has this choice been selected?
 * @property {SelectChoices} [children]  Nested choices.
 */

/**
 * Object with a number of methods for performing actions on a nested set of choices.
 *
 * @param {Object<string, SelectChoicesEntry>} [choices={}]  Initial choices for the object.
 * @param {object} [options={}]
 * @param {boolean} [options.allowCategories=false]  Whether only children should be considered as part of this
 *                                                   SelectChoices set or should the categories themselves be included.
 */
export default class SelectChoices {
  constructor(choices={}, { allowCategories=false }={}) {
    const clone = foundry.utils.deepClone(choices);
    for ( const value of Object.values(clone) ) {
      if ( !value.children || (value.children instanceof SelectChoices) ) continue;
      value.category = true;
      value.children = new this.constructor(value.children);
    }
    Object.assign(this, clone);
    Object.defineProperty(this, "allowCategories", {
      configurable: false,
      enumerable: false,
      value: allowCategories,
      writable: true
    });
  }

  /* -------------------------------------------- */

  /**
   * Most recent filter applied to this SelectChoices.
   * @type {Set<string>}
   */
  #lastFilter;

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
    clone.allowCategories = this.allowCategories;
    return clone;
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
      else if ( this.allowCategories ) set.add(key);
      else choice.children.set.forEach(k => set.add(k));
    }
    return set;
  }

  /* -------------------------------------------- */

  /**
   * Filters choices in place to only include the provided keys.
   * @param {Set<string>|SelectChoices} filter   Keys of traits to retain or another SelectOptions object.
   * @param {object} [options={}]
   * @param {boolean} [options.allowCategories]  Only include a category's children if they are specifically
   *                               included in the filter set. If set to false, then all of a category's
   *                               children will be included so long as the category is in the filter set.
   * @returns {SelectChoices}      This SelectChoices with filter applied.
   */
  filter(filter, { allowCategories }={}) {
    if ( allowCategories === undefined ) allowCategories = filter.allowCategories ?? this.allowCategories;
    else this.allowCategories = allowCategories;
    if ( filter instanceof SelectChoices ) filter = filter.#lastFilter ?? filter.set;

    for ( const [key, trait] of Object.entries(this) ) {
      if ( filter.has(key) ) {
        if ( trait.children && allowCategories ) {
          trait.children.filter(filter, { allowCategories });
          if ( foundry.utils.isEmpty(trait.children) ) delete trait.children;
        }
        continue;
      }

      let selectedChildren = false;
      if ( trait.category ) {
        if ( !allowCategories || !filter.has(key) ) {
          trait.children.filter(filter, { allowCategories });
          if ( !foundry.utils.isEmpty(trait.children) ) selectedChildren = true;
        } else {
          delete trait.children;
        }
      }

      if ( !selectedChildren ) delete this[key];
    }

    this.#lastFilter = filter;
    return this;
  }

  /* -------------------------------------------- */

  /**
   * Filters choices to only include the provided keys, returning a new SelectChoices object.
   * @param {Set<string>|SelectChoices} filter   Keys of traits to retain or another SelectOptions object.
   * @param {object} [options={}]
   * @param {boolean} [options.allowCategories=false]  Only include a category's children if they are specifically
   *                           included in the filter set. If set to false, then all of a category's children will
   *                           be included so long as the category is in the filter set.
   * @returns {SelectChoices}  Clone of SelectChoices with filter applied.
   */
  filtered(filter, options) {
    return this.clone().filter(filter, options);
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
