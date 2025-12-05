/**
 * Subclass of StringField that tracks an actor's size.
 */
export default class SizeField extends foundry.data.fields.StringField {

  #actorSizes = Object.entries(CONFIG.DND5E.actorSizes).reduce((obj, [key, size]) => {
    obj[key] = obj[size.numerical] = { ...size, key };
    obj.length = (obj.length ?? 0) + 1;
    return obj;
  }, {});

  /* -------------------------------------------- */
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /* -------------------------------------------- */

  /** @override */
  _applyChangeOverride(value, delta, model, change) {
    // Force a given actor size.
    if ( Number.isNumeric(delta) ) delta = Math.clamp(delta, 0, this.#actorSizes.length - 1);
    return this.#actorSizes[delta]?.key ?? value;
  }

  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    // Increment actor size by a numeric value
    if ( !Number.isNumeric(delta) ) return value;
    const increment = parseInt(delta);
    const currentNumerical = this.#actorSizes[value].numerical;
    const newNumerical = Math.clamp(currentNumerical + increment, 0, this.#actorSizes.length - 1);
    return this.#actorSizes[newNumerical].key;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    // Multiply actor size, based on token footprint
    if ( !Number.isNumeric(delta) || parseFloat(delta) === 1 ) return value;
    const currentTokenSize = this.#actorSizes[value].token ?? 1;
    const targetTokenSize = currentTokenSize * delta;
    let result = this.#actorSizes[this.#actorSizes.length - 1].key;
    for ( let i = 0; i < this.#actorSizes.length; i++ ) {
      const lower = i ? ( this.#actorSizes[i-1].token ?? 1 ) : -Infinity;
      const upper = this.#actorSizes[i].token ?? 1;
      if ( targetTokenSize >= lower && targetTokenSize <= upper ) {
        const closestIndex = Math.abs(targetTokenSize - lower) > Math.abs(targetTokenSize - upper) ? i : i - 1;
        result = this.#actorSizes[closestIndex].key;
        if ( delta > 1 ) break;
      }
      if ( targetTokenSize < lower ) break;
    }
    return result;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    // Upgrade actor size to a larger value
    const currentNumerical = this.#actorSizes[value].numerical;
    if ( Number.isNumeric(delta) ) delta = Math.clamp(delta, 0, this.#actorSizes.length - 1);
    let targetNumerical = this.#actorSizes[delta]?.numerical ?? currentNumerical;
    const newNumerical = Math.max(currentNumerical, targetNumerical);
    return this.#actorSizes[newNumerical].key;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    // Downgrade actor size to a smaller value
    const currentNumerical = this.#actorSizes[value].numerical;
    if ( Number.isNumeric(delta) ) delta = Math.clamp(delta, 0, this.#actorSizes.length - 1);
    let targetNumerical = this.#actorSizes[delta]?.numerical ?? currentNumerical;
    const newNumerical = Math.min(currentNumerical, targetNumerical);
    return this.#actorSizes[newNumerical].key;
  }

}
