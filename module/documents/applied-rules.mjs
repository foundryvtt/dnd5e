import { simplifyBonus } from "../utils.mjs";

/**
 * @import { AdvantageModeData } from "../data/fields/_types.mjs";
 */

const D20_TESTS = new Set(["attack", "check", "save"]);

/**
 * @extends {Map<string, Map<string, ChangeData[]>>}
 */
export default class AppliedRules extends Map {
  /**
   * Add a change to the collection of applied rules.
   * @param {ActiveEffectChangeData} change
   */
  add(change) {
    const type = change.type.startsWith("dnd5e.") ? change.type.split(".")[1] : change.type;
    this.getOrInsert(change.key, new Map()).getOrInsert(type, []).push(change);
  }

  /* -------------------------------------------- */

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
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Consolidate rules from actor and items.
   * @param {string} rule      Rule target and type separated by a colon (e.g. "attack:bonus").
   * @param {Actor5e} [actor]  Actor from which to fetch the rules.
   * @param {Item5e} [item]    Item from which to fetch the rules.
   * @yields {ActiveEffectChangeData}
   */
  static *#collect(rule, actor, item) {
    const [category, key] = rule.split(":");
    if ( D20_TESTS.has(category) ) yield* AppliedRules.#collect(`d20:${key}`, actor, item);
    for ( const r of actor?.appliedRules.get(rule) ?? [] ) yield r;
    for ( const r of item?.appliedRules.get(rule) ?? [] ) yield r;
  }

  /* -------------------------------------------- */

  /**
   * Consolidate rules from actor and items.
   * @param {string} rule      Rule target and type separated by a colon (e.g. "attack:bonus").
   * @param {Actor5e} [actor]  Actor from which to fetch the rules.
   * @param {Item5e} [item]    Item from which to fetch the rules.
   * @returns {RulesIterator<ActiveEffectChangeData>}
   */
  static collect(rule, actor, item) {
    return new RulesIterator(AppliedRules.#collect(rule, actor, item));
  }

  /* -------------------------------------------- */

  /**
   * Create a rules iterator from an iterable object.
   * @param {Iterable<ActiveEffectChangeData>} rules  Some kind of iterable object containing rules.
   * @returns {RulesIterator<ActiveEffectChangeData>}
   */
  static createIterator(rules) {
    return new RulesIterator(Iterator.from(rules));
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
   * @param {object} [options={}]
   * @param {Set<ActiveEffectChangeData>} [options.consumed]  Set of consumed rules to skip, selected rules added to.
   * @returns {RulesIterator<ActiveEffectChangeData>}
   */
  filterWith(rollData, { consumed }={}) {
    return new RulesIterator(this.filter(r => {
      if ( consumed?.has(r) ) return false;
      if ( r.effect?.system.conditions?.check(rollData) === false ) return false;
      if ( r.conditions?.check(rollData) === false ) return false;
      if ( consumed ) consumed.add(r);
      return true;
    }));
  }

  /* -------------------------------------------- */

  /**
   * Count advantage mode values into number of advantages and disadvantages.
   * @param {Partial<AdvantageModeData>} [counts]  Existing counts with which to merge rule counts.
   * @returns {AdvantageModeData}
   */
  toAdvantageCounts(counts={}) {
    return this.values(String).reduce((data, value) => {
      switch ( value ) {
        // 1 - Add advantage
        case "1":
        case "+1": data.advantages.count++; break;
        // -1 - Add disadvantage
        case "-1": data.disadvantages.count++; break;
        // =1 - Always advantage
        case "=1":
        case "=+1": data.override = 1; break;
        // =-1 - Always disadvantage
        case "=-1": data.override = -1; break;
        // >=0 - Cannot have disadvantage
        case ">=0": data.disadvantages.suppressed = true; break;
        // <=0 - Cannot have advantage
        case "<=0": data.advantages.suppressed = true; break;
      }
      return data;
    }, foundry.utils.mergeObject({
      advantages: { count: 0, suppressed: false },
      disadvantages: { count: 0, suppressed: false },
      override: null
    }, counts));
  }

  /* -------------------------------------------- */

  /**
   * Convert each value of the iterator to a single formula.
   * @param {string[]} [parts]  Additional parts to combine.
   * @returns {string}
   */
  toFormula(parts) {
    return this.values(String).toArray().concat(parts ?? []).join(" + ");
  }

  /* -------------------------------------------- */

  /**
   * Find the highest value among all of the provided rules, or `-Infinity` if no rules are available.
   * @param {number} [initial]  Starting value to compare against.
   * @returns {number}
   */
  toLargest(initial) {
    return this.values(Number).reduce((max, value) => value > max ? value : max, initial ?? -Infinity);
  }

  /* -------------------------------------------- */

  /**
   * Find the lowest value among all of the provided rules, or `Infinity` if no rules are available.
   * @param {number} [initial]  Starting value to compare against.
   * @returns {number}
   */
  toSmallest(initial) {
    return this.values(Number).reduce((min, value) => value < min ? value : min, initial ?? Infinity);
  }

  /* -------------------------------------------- */

  /**
   * Use `simplifyBonus` to deterministically resolve all values.
   * @param {object} data  Data to use for replacing @ strings.
   * @returns {RulesIterator<number>}
   */
  resolve(data) {
    return new RulesIterator(this.values(String).map(v => simplifyBonus(v, data)).filter(v => v));
  }

  /* -------------------------------------------- */

  /**
   * Transform each rule element into its underlying value.
   * @param {Number|String} [type]  Transform value into specific primitive type.
   * @returns {RulesIterator<any>}
   */
  values(type) {
    return new RulesIterator(
      this.map(r => r.value ?? r).filter(v => (v !== "") && (v != null)).map(v => type ? type(v) : v)
    );
  }
}
