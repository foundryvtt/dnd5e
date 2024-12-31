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
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    if ( ![-1, 1].includes(delta) ) return value;
    const roll = foundry.utils.getProperty(model, change.key.substring(0, change.key.lastIndexOf(".")));
    roll.advantage ??= 0;
    roll.disadvantage ??= 0;
    if ( delta === 1 ) roll.advantage++;
    else roll.disadvantage++;
    const src = foundry.utils.getProperty(model._source, change.key) ?? 0;
    return Math.sign(roll.advantage + Number(src === 1)) - Math.sign(roll.disadvantage + Number(src === -1));
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
