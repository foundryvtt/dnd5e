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
    const counts = this.constructor.getCounts(model, change.key);
    if ( delta === 1 ) counts.advantages.count++;
    else counts.disadvantages.count++;
    return this.constructor.resolveMode(model, change, counts);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    // Downgrade the roll so that it can no longer benefit from advantage.
    if ( (delta !== -1) && (delta !== 0) ) return value;
    const counts = this.constructor.getCounts(model, change.key);
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
      this.constructor.getCounts(model, change.key).override = delta;
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
   * Retrieve the counts from several advantage mode fields and determine the final advantage mode.
   * @param {DataModel} model                      The model containing the fields.
   * @param {string[]} keyPaths                    Paths to the individual fields to combine within the model.
   * @param {Partial<AdvantageModeData>} [counts]  External sources of advantage/disadvantage.
   * @returns {{ advantage: boolean, disadvantage: boolean, mode: number }}
   */
  static combineFields(model, keyPaths, counts={}) {
    counts = foundry.utils.mergeObject({
      override: null,
      advantages: { count: 0, suppressed: false },
      disadvantages: { count: 0, suppressed: false }
    }, counts);
    for ( const kp of keyPaths ) {
      const c = this.getCounts(model, kp);
      const src = foundry.utils.getProperty(model._source, kp) ?? 0;
      if ( c.override !== null ) counts.override = c.override;
      if ( c.advantages.suppressed ) counts.advantages.suppressed = true;
      if ( c.disadvantages.suppressed ) counts.disadvantages.suppressed = true;
      counts.advantages.count += c.advantages.count + Number(src === 1);
      counts.disadvantages.count += c.disadvantages.count + Number(src === -1);
    }
    return {
      advantage: (counts.advantages.count > 0) && !counts.advantages.suppressed
        && ((counts.override === null) || (counts.override === 1)),
      disadvantage: (counts.disadvantages.count > 0) && !counts.disadvantages.suppressed
        && ((counts.override === null) || (counts.override === -1)),
      mode: this.resolveMode(model, null, counts)
    };
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the advantage/disadvantage counts from the model.
   * @param {DataModel} model                  The model the change is applied to.
   * @param {string|EffectChangeData} keyPath  Path to the field or effect change being applied.
   * @returns {AdvantageModeData}
   */
  static getCounts(model, keyPath) {
    keyPath = foundry.utils.getType(keyPath) === "Object" ? keyPath.key : keyPath;
    const parentKey = keyPath.substring(0, keyPath.lastIndexOf("."));
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
   * @param {DataModel} model                  The model the change is applied to.
   * @param {string|EffectChangeData} keyPath  Path to the field or effect change being applied.
   * @param {AdvantageModeData} [counts]       The current advantage/disadvantage counts.
   * @returns {number}                         An integer in the interval [-1, 1], indicating advantage (1),
   *                                           disadvantage (-1), or neither (0).
   */
  static resolveMode(model, keyPath, counts) {
    keyPath = foundry.utils.getType(keyPath) === "Object" ? keyPath.key : keyPath;
    const { override, advantages, disadvantages } = counts ?? this.getCounts(model, keyPath);
    if ( override !== null ) return override;
    const src = foundry.utils.getProperty(model._source, keyPath) ?? 0;
    const advantageCount = advantages.suppressed ? 0 : advantages.count + Number(src === 1);
    const disadvantageCount = disadvantages.suppressed ? 0 : disadvantages.count + Number(src === -1);
    return Math.sign(advantageCount) - Math.sign(disadvantageCount);
  }

  /* -------------------------------------------- */

  /**
   * Helper for setting the advantage mode programmatically.
   * @param {DataModel} model                   The model the change is applied to.
   * @param {string} keyPath                    Path to the advantage mode field on the model.
   * @param {number} value                      An integer in the interval [-1, 1], indicating advantage (1),
   *                                            disadvantage (-1), or neither (0).
   * @param {object} [options={}]
   * @param {boolean} [options.override=false]  Override the mode rather than following the normal advantage rules.
   * @returns {number}                          Final advantage value.
   */
  static setMode(model, keyPath, value, { override=false }={}) {
    const field = keyPath.startsWith("system.") ? model.system.schema.getField(keyPath.slice(7))
      : model.schema.getField(keyPath);
    const change = { key: keyPath, value, mode: CONST.ACTIVE_EFFECT_MODES[override ? "OVERRIDE" : "ADD"] };
    const final = field.applyChange(foundry.utils.getProperty(model, keyPath), model, change);
    foundry.utils.setProperty(model, keyPath, final);
    return final;
  }
}
