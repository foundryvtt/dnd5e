/**
 * Subclass of NumberField that tracks the number of changes made to a roll mode.
 */
export default class AdvantageModeField extends foundry.data.fields.NumberField {
  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      choices: [-1, 0, 1],
      initial: 0,
      label: "DND5E.AdvantageMode"
    });
  }

  /* -------------------------------------------- */

  /**
   * Number of advantage modifications.
   * @type {number}
   */
  #advantage;

  /* -------------------------------------------- */

  /**
   * Number of disadvantage modifications.
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
  applyChange(value, model, change) {
    const delta = this._castChangeDelta(change.value);
    if ( change.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM ) {
      return this._applyChangeCustom(value, delta, model, change);
    }
    switch (delta) {
      case 1:
        this.#advantage++;
        break;
      case -1:
        this.#disadvantage++;
        break;
    }
    return Math.sign(this.#advantage) - Math.sign(this.#disadvantage);
  }
}
