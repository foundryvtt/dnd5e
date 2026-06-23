import TypeDataField5e from "./type-data-field.mjs";

/**
 * Data field that selects the appropriate advancement data model if available, otherwise defaults to generic
 * `ObjectField` to prevent issues with custom advancement types that aren't currently loaded.
 */
export default class AdvancementField extends TypeDataField5e {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "`AdvancementField` has been deprecated in favor of a `TypeDataField5e`.",
      { since: "DnD5e 6.0", until: "DnD5e 6.2" }
    );
    super(...args);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      getModel: type => CONFIG.DND5E.advancementTypes[type]?.documentClass
    });
  }
}
