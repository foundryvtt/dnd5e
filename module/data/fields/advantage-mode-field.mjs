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

  /**
   * Have sources of advantage been nullified?
   * @type {boolean}
   */
  #nullAdvantage;

  /* -------------------------------------------- */

  /**
   * Have sources of disadvantage been nullified?
   * @type {boolean}
   */
  #nullDisadvantage;

  /* -------------------------------------------- */

  /**
   * A forced value due to an override.
   * @type {-1|0|1|void}
   */
  #override;

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    this.#advantage = Number(value === 1);
    this.#disadvantage = Number(value === -1);
    this.#nullAdvantage = this.#nullDisadvantage = false;
    this.#override = null;
    return value;
  }

  /* -------------------------------------------- */

  /**
   * Calculate the current advantage mode.
   * @returns {-1|0|1}
   */
  #calculateAdvantageMode() {
    if ( AdvantageModeField.#values.includes(this.#override) ) return this.#override;
    const advantage = this.#nullAdvantage ? 0 : Math.sign(this.#advantage);
    const disadvantage = this.#nullDisadvantage ? 0 : Math.sign(this.#disadvantage);
    return advantage - disadvantage;
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
    return this.#calculateAdvantageMode();
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    if ( [-1, 0].includes(delta) ) this.#nullAdvantage = true;
    return this.#calculateAdvantageMode();
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    return this.#calculateAdvantageMode();
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeOverride(value, delta, model, change) {
    if ( AdvantageModeField.#values.includes(delta) ) this.#override = delta;
    return this.#calculateAdvantageMode();
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    if ( [0, 1].includes(delta) ) this.#nullDisadvantage = true;
    return this.#calculateAdvantageMode();
  }
}
