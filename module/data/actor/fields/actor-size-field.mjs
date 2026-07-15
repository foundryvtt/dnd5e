/**
 * Custom string field with some special handling for increasing and decreasing sizes.
 */
export default class ActorSizeField extends foundry.data.fields.StringField {
  /* -------------------------------------------- */
  /*  Field Cleaning                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _cast(value) {
    value = super._cast(value);
    return CONFIG.DND5E.actorSizes.fullKeys[value] ?? value;
  }

  /* -------------------------------------------- */
  /*  Active Effect Integration                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _castChangeDelta(delta, replacementData={}) {
    if ( Number.isNumeric(delta) ) return parseInt(delta);
    return super._castChangeDelta(delta, replacementData);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    if ( !Number.isNumeric(delta) ) return value;
    const idx = CONFIG.DND5E.actorSizes.orderedKeys.findIndex(k => k === value);
    return CONFIG.DND5E.actorSizes.orderedKeys[
      Math.clamp(idx + delta, 0, CONFIG.DND5E.actorSizes.orderedKeys.length - 1)
    ];
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeSubtract(value, delta, model, change) {
    if ( !Number.isNumeric(delta) ) return value;
    return this._applyChangeAdd(value, delta * -1, model, change);
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    const valueN = CONFIG.DND5E.actorSizes[value]?.numerical ?? -Infinity;
    const deltaN = CONFIG.DND5E.actorSizes[delta]?.numerical ?? -Infinity;
    return deltaN > valueN ? delta : value;
  }

  /* -------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    const valueN = CONFIG.DND5E.actorSizes[value]?.numerical ?? -Infinity;
    const deltaN = CONFIG.DND5E.actorSizes[delta]?.numerical ?? -Infinity;
    return deltaN < valueN ? delta : value;
  }
}
