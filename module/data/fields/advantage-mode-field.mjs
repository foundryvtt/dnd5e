/**
 * Subclass of NumberField that tracks the number of changes made to a roll mode.
 */
export default class AdvantageModeField extends foundry.data.fields.NumberField {
  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      choices: AdvantageModeField.#values,
      initial: 0,
      label: "DND5E.AdvantageMode"
    });
  }

  /* -------------------------------------------- */

  /**
   * Allowed advantage mode values.
   * @type {number[]}
   */
  static #values = [-1, 0, 1];

  /* -------------------------------------------- */

  /**
   * Number of advantage sources.
   * @type {number}
   */
  #advantage;

  /* -------------------------------------------- */

  /**
   * Number of disadvantage sources.
   * @type {number}
   */
  #disadvantage;

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    this.#advantage = Number(value === 1);
    this.#disadvantage = Number(value === -1);
    return value;
  }

  /* -------------------------------------------- */
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    switch ( delta ) {
      case 1:
        this.#advantage++;
        break;
      case -1:
        this.#disadvantage++;
        break;
    }
    return Math.sign(this.#advantage) - Math.sign(this.#disadvantage);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeOverride(value, delta, model, change) {
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    return value;
  }
}
