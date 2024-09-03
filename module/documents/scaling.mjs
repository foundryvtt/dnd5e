/**
 * Lightweight class containing scaling information for an item that is used in roll data to ensure it is available
 * in the correct format in roll formulas: `@scaling` is the scaling value, and `@scaling.increase` as the scaling
 * steps above baseline.
 *
 * @param {number} increase  Scaling steps above baseline.
 */
export default class Scaling {
  constructor(increase) {
    this.#increase = increase;
  }

  /* -------------------------------------------- */

  /**
   * Scaling steps above baseline.
   * @type {number}
   */
  #increase;

  get increase() {
    return this.#increase;
  }

  /* -------------------------------------------- */

  /**
   * Value of the scaling starting 1.
   * @type {string}
   */
  get value() {
    return this.#increase + 1;
  }

  /* -------------------------------------------- */

  /** @override */
  toString() {
    return this.value;
  }
}
