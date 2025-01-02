/**
 * @typedef AdvantageModeData
 * @property {number|null} override               Whether the mode has been entirely overridden.
 * @property {AdvantageModeCounts} advantages     The advantage counts.
 * @property {AdvantageModeCounts} disadvantages  The disadvantage counts.
 */

/**
 * @typedef AdvantageModeCounts
 * @property {number} count          The number of applications of this mode.
 * @property {boolean} [suppressed]  Whether this mode is suppressed.
 */

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
    // Add a source of advantage or disadvantage.
    if ( (delta !== -1) && (delta !== 1) ) return value;
    const counts = this.constructor.getCounts(model, change);
    if ( delta === 1 ) counts.advantages.count++;
    else counts.disadvantages.count++;
    return this.constructor.resolveMode(model, change, counts);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    // Downgrade the roll so that it can no longer benefit from advantage.
    if ( (delta !== -1) && (delta !== 0) ) return value;
    const counts = this.constructor.getCounts(model, change);
    counts.advantages.suppressed = true;
    if ( delta === -1 ) counts.disadvantages.count++;
    return this.constructor.resolveMode(model, change, counts);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeOverride(value, delta, model, change) {
    // Force a given roll mode.
    if ( (delta === -1) || (delta === 0) || (delta === 1) ) {
      this.constructor.getCounts(model, change).override = delta;
      return delta;
    }
    return value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    // Upgrade the roll so that it can no longer be penalised by disadvantage.
    if ( (delta !== 1) && (delta !== 0) ) return value;
    const counts = this.constructor.getCounts(model, change);
    counts.disadvantages.suppressed = true;
    if ( delta === 1 ) counts.advantages.count++;
    return this.constructor.resolveMode(model, change, counts);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve the advantage/disadvantage counts from the model.
   * @param {DataModel} model          The model the change is applied to.
   * @param {EffectChangeData} change  The change to apply.
   * @returns {AdvantageModeData}
   */
  static getCounts(model, change) {
    const parentKey = change.key.substring(0, change.key.lastIndexOf("."));
    const roll = foundry.utils.getProperty(model, parentKey) ?? {};
    return roll.modeCounts ??= {
      override: null,
      advantages: { count: 0, suppressed: false },
      disadvantages: { count: 0, suppressed: false }
    };
  }

  /* -------------------------------------------- */

  /**
   * Resolve multiple sources of advantage and disadvantage into a single roll mode per the game rules.
   * @param {DataModel} model             The model the change is applied to.
   * @param {EffectChangeData} change     The change to applied.
   * @param {AdvantageModeData} [counts]  The current advantage/disadvantage counts.
   * @returns {number}                    An integer in the interval [-1, 1], indicating advantage (1),
   *                                      disadvantage (-1), or neither (0).
   */
  static resolveMode(model, change, counts) {
    const { override, advantages, disadvantages } = counts ?? this.getCounts(model, change);
    if ( override !== null ) return override;
    const src = foundry.utils.getProperty(model._source, change.key) ?? 0;
    const advantageCount = advantages.suppressed ? 0 : advantages.count + Number(src === 1);
    const disadvantageCount = disadvantages.suppressed ? 0 : disadvantages.count + Number(src === -1);
    return Math.sign(advantageCount) - Math.sign(disadvantageCount);
  }
}
