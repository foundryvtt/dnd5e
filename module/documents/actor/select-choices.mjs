import { sortObjectEntries } from "../../utils.mjs";

/**
 * Object representing a nested set of choices to be displayed in a grouped select list or a trait selector.
 *
 * @typedef {object} SelectChoicesEntry
 * @property {string} label              Label, either pre- or post-localized.
 * @property {boolean} [chosen]          Has this choice been selected?
 * @property {boolean} [sorting=true]    Should this value be sorted? If there are a mixture of this value at
 *                                       a level, unsorted values are listed first followed by sorted values.
 * @property {SelectChoices} [children]  Nested choices. If wildcard filtering support is desired, then trait keys
 *                                       should be provided prefixed for children (e.g. `parent:child`, rather than
 *                                       just `child`).
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
   * Are there no entries in this choices object.
   * @type {boolean}
   */
  get isEmpty() {
    return Object.keys(this).length === 0;
  }

  /* -------------------------------------------- */

  /**
   * Create a set of available choice keys.
   * @param {Set<string>} [set]  Existing set to which the values will be added.
   * @returns {Set<string>}
   */
  asSet(set) {
    set ??= new Set();
    for ( const [key, choice] of Object.entries(this) ) {
      if ( choice.children ) choice.children.asSet(set);
      else set.add(key);
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
   * Find key and value for the provided key or key suffix.
   * @param {string} key  Full prefixed key (e.g. `tool:art:alchemist`) or just the suffix (e.g. `alchemist`).
   * @returns {[string, SelectChoicesEntry]|null}  An array with the first value being the matched key,
   *                                               and the second being the value.
   */
  find(key) {
    for ( const [k, v] of Object.entries(this) ) {
      if ( (k === key) || k.endsWith(`:${key}`) ) {
        return [k, v];
      } else if ( v.children ) {
        const result = v.children.find(key);
        if ( result ) return result;
      }
    }
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Execute the provided function for each entry in the object.
   * @param {Function} func  Function to execute on each entry. Receives the trait key and value.
   */
  forEach(func) {
    for ( const [key, value] of Object.entries(this) ) {
      func(key, value);
      if ( value.children ) value.children.forEach(func);
    }
  }

  /* -------------------------------------------- */

  /**
   * Merge another SelectChoices object into this one.
   * @param {SelectChoices} other
   * @param {object} [options={}]
   * @param {boolean} [options.inplace=true]  Should this SelectChoices be mutated or a new one returned?
   * @returns {SelectChoices}
   */
  merge(other, { inplace=true }={}) {
    if ( !inplace ) return this.clone().merge(other);
    return foundry.utils.mergeObject(this, other);
  }

  /* -------------------------------------------- */

  /**
   * Internal sorting method.
   * @param {object} lhs
   * @param {object} rhs
   * @returns {number}
   * @protected
   */
  _sort(lhs, rhs) {
    if ( (lhs.sorting === false) && (rhs.sorting === false) ) return 0;
    if ( lhs.sorting === false ) return -1;
    if ( rhs.sorting === false ) return 1;
    return lhs.label.localeCompare(rhs.label, game.i18n.lang);
  }

  /* -------------------------------------------- */

  /**
   * Sort the entries using the label.
   * @param {object} [options={}]
   * @param {boolean} [options.inplace=true]  Should this SelectChoices be mutated or a new one returned?
   * @returns {SelectChoices}
   */
  sort({ inplace=true }={}) {
    const sorted = new SelectChoices(sortObjectEntries(this, this._sort));

    if ( inplace ) {
      for ( const key of Object.keys(this) ) delete this[key];
      this.merge(sorted);
      for ( const entry of Object.values(this) ) {
        if ( entry.children ) entry.children.sort();
      }
      return this;
    }

    else {
      for ( const entry of Object.values(sorted) ) {
        if ( entry.children ) entry.children = entry.children.sort({ inplace });
      }
      return sorted;
    }
  }

  /* -------------------------------------------- */

  /**
   * Filters choices in place to only include the provided keys.
   * @param {Set<string>|SelectChoices} filter   Keys of traits to retain or another SelectChoices object.
   * @param {object} [options={}]
   * @param {boolean} [options.inplace=true]     Should this SelectChoices be mutated or a new one returned?
   * @returns {SelectChoices}                    This SelectChoices with filter applied.
   *
   * @example
   * const choices = new SelectChoices({
   *   categoryOne: { label: "One" },
   *   categoryTwo: { label: "Two", children: {
   *     childOne: { label: "Child One" },
   *     childTwo: { label: "Child Two" }
   *   } }
   * });
   *
   * // Results in only categoryOne
   * choices.filter(new Set(["categoryOne"]));
   *
   * // Results in only categoryTwo, but none if its children
   * choices.filter(new Set(["categoryTwo"]));
   *
   * // Results in categoryTwo and all of its children
   * choices.filter(new Set(["categoryTwo:*"]));
   *
   * // Results in categoryTwo with only childOne
   * choices.filter(new Set(["categoryTwo:childOne"]));
   *
   * // Results in categoryOne, plus categoryTwo with only childOne
   * choices.filter(new Set(["categoryOne", "categoryTwo:childOne"]));
   *
   * @example
   * const choices = new SelectChoices({
   *   "type:categoryOne": { label: "One" },
   *   "type:categoryTwo": { label: "Two", children: {
   *     "type:categoryOne:childOne": { label: "Child One" },
   *     "type:categoryOne:childTwo": { label: "Child Two" }
   *   } }
   * });
   *
   * // Results in no changes
   * choices.filter(new Set(["type:*"]));
   *
   * // Results in only categoryOne
   * choices.filter(new Set(["type:categoryOne"]));
   *
   * // Results in categoryTwo and all of its children
   * choices.filter(new Set(["type:categoryTwo:*"]));
   *
   * // Results in categoryTwo with only childOne
   * choices.filter(new Set(["type:categoryTwo:childOne"]));
   */
  filter(filter, { inplace=true }={}) {
    if ( !inplace ) return this.clone().filter(filter);
    if ( filter instanceof SelectChoices ) filter = filter.asSet();

    for ( const [key, trait] of Object.entries(this) ) {
      // Remove children if direct match and no wildcard for this category present
      const wildcardKey = key.replace(/(:|^)(\w+)$/, "$1*");
      if ( filter.has(key) && !filter.has(wildcardKey) ) {
        if ( trait.children ) delete trait.children;
      }

      // Check children, remove entry if no children match filter
      else if ( !filter.has(wildcardKey) && !filter.has(`${key}:*`) ) {
        if ( trait.children ) trait.children.filter(filter);
        if ( !trait.children || trait.children.isEmpty ) delete this[key];
      }

      // Remove ALL entries if wildcard is used
      else if ( filter.has(wildcardKey) && key.endsWith(":ALL") ) delete this[key];
    }

    return this;
  }

  /* -------------------------------------------- */

  /**
   * Removes in place any traits or categories the keys of which are included in the exclusion set.
   * Note: Wildcard keys are not supported with this method.
   * @param {Set<string>} keys                Set of keys to remove from the choices.
   * @param {object} [options={}]
   * @param {boolean} [options.inplace=true]  Should this SelectChoices be mutated or a new one returned?
   * @returns {SelectChoices}                 This SelectChoices with excluded keys removed.
   *
   * @example
   * const choices = new SelectChoices({
   *   categoryOne: { label: "One" },
   *   categoryTwo: { label: "Two", children: {
   *     childOne: { label: "Child One" },
   *     childTwo: { label: "Child Two" }
   *   } }
   * });
   *
   * // Results in categoryOne being removed
   * choices.exclude(new Set(["categoryOne"]));
   *
   * // Results in categoryOne and childOne being removed, but categoryTwo and childTwo remaining
   * choices.exclude(new Set(["categoryOne", "categoryTwo:childOne"]));
   */
  exclude(keys, { inplace=true }={}) {
    if ( !inplace ) return this.clone().exclude(keys);
    for ( const [key, trait] of Object.entries(this) ) {
      if ( keys.has(key) ) delete this[key];
      else if ( trait.children ) trait.children = trait.children.exclude(keys);
    }
    return this;
  }
}
