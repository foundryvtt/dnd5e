import TraitsConfig from "../config/traits-config.mjs";

/**
 * A specialized application used to modify actor traits.
 *
 * @param {Actor5e} actor                       Actor for whose traits are being edited.
 * @param {string} trait                        Trait key as defined in CONFIG.traits.
 * @param {object} [options={}]
 * @param {boolean} [options.allowCustom=true]  Support user custom trait entries.
 */
export default class TraitSelector extends TraitsConfig {
  constructor(actor, trait, options={}) {
    foundry.utils.logCompatibilityWarning(
      "The `TraitSelector` application has been deprecated and replaced with `BaseTraitsConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor, trait });
  }
}
