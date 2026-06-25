/**
 * @extends {Map<string, Map<string, ChangeData[]>>}
 */
export default class AppliedRules extends Map {
  /** @inheritDoc */
  get(key) {
    if ( !key ) return;
    if ( key.includes(":") ) {
      const [target, type] = key.split(":", 2);
      return super.get(target)?.get(type);
    }
    return super.get(key);
  }

  /* -------------------------------------------- */

  /**
   * Get just the rule values for a provided key.
   * @param {string} key  Rule target and type separated by a colon (e.g. "attack:bonus").
   * @returns {any[]}
   */
  getValues(key) {
    return this.get(key)?.map(c => c.value) ?? [];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  set(key, value) {
    if ( !key ) return this;
    if ( key.type && key.key ) {
      const type = key.type.split(".")[1];
      if ( !this.has(key.key) ) super.set(key.key, new Map());
      if ( this.get(key.key).has(type) ) this.get(key.key).get(type).push(key);
      else this.get(key.key).set(type, [key]);
    } else {
      super.set(key, value);
    }
    return this;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Consolidate rules from actor and items.
   * @param {string} rule      Rule target and type separated by a colon (e.g. "attack:bonus").
   * @param {Actor5e} [actor]  Actor from which to fetch the rules.
   * @param {Item5e} [item]    Item from which to fetch the rules.
   * @yields {ChangeData}
   */
  static *#collect(rule, actor, item) {
    for ( const r of actor?.appliedRules.get(rule) ?? [] ) yield r;
    for ( const r of item?.appliedRules.get(rule) ?? [] ) yield r;
  }

  /* -------------------------------------------- */

  /**
   * Consolidate rules from actor and items.
   * @param {string} rule      Rule target and type separated by a colon (e.g. "attack:bonus").
   * @param {Actor5e} [actor]  Actor from which to fetch the rules.
   * @param {Item5e} [item]    Item from which to fetch the rules.
   * @returns {RulesIterator}
   */
  static collect(rule, actor, item) {
    return new RulesIterator(AppliedRules.#collect(rule, actor, item));
  }
}

/* -------------------------------------------- */

/**
 * Special iterator for rules that adds some additional helper methods.
 */
class RulesIterator extends Iterator {
  constructor(iterator) {
    super();
    this.#iterator = iterator;
  }

  /* -------------------------------------------- */

  /**
   * Internal iterator.
   * @type {Iterator}
   */
  #iterator;

  /* -------------------------------------------- */

  /** @override */
  next() {
    return this.#iterator.next();
  }

  /* -------------------------------------------- */

  /**
   * Filter rules based on effect & change conditions.
   * @param {RollData} rollData
   * @returns {RulesIterator}
   */
  filterWith(rollData) {
    return new RulesIterator(this.filter(r => {
      if ( r.effect?.system.conditions?.recheck(rollData) === false ) return false;
      if ( r.conditions?.recheck(rollData) === false ) return false;
      return true;
    }));
  }

  /* -------------------------------------------- */

  /**
   * Convert each value of the iterator to a single formula.
   * @returns {string}
   */
  toFormula() {
    return this.values(String).toArray().join(" + ");
  }

  /* -------------------------------------------- */

  /**
   * Find the highest value among all of the provided rules, or `-Infinity` of no rules are available.
   * @returns {number}
   */
  toLargest() {
    return this.values(Number).reduce((max, value) => value > max ? value : max, -Infinity);
  }

  /* -------------------------------------------- */

  /**
   * Find the lowest value among all of the provided rules, or `Infinity` of no rules are available.
   * @returns {number}
   */
  toSmallest() {
    return this.values(Number).reduce((min, value) => value < min ? value : min, Infinity);
  }

  /* -------------------------------------------- */

  /**
   * Transform each rule element into its underlying value.
   * @param {Number|String} [type]  Transform value into specific primitive type.
   * @returns {RulesIterator}
   */
  values(type) {
    return new RulesIterator(this.map(r => type ? type(r.value ?? r) : r.value ?? r));
  }
}
