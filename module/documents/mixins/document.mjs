import SystemFlagsMixin from "./flags.mjs";

/**
 * Mixin used to share some logic between Actor & Item documents.
 * @type {function(Class): Class}
 * @mixin
 */
export default Base => class extends SystemFlagsMixin(Base) {

  /** @inheritDoc */
  get _systemFlagsDataModel() {
    return this.system?.metadata?.systemFlagsModel ?? null;
  }
};
