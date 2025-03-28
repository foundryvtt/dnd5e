import ActiveEffect5e from "../../../documents/active-effect.mjs";

/**
 * An abstract class containing common functionality between actor sheet configuration apps.
 * @extends {DocumentSheet}
 * @abstract
 */
export default class BaseConfigSheet extends DocumentSheet {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `BaseConfigSheet` application has been deprecated and replaced with `BaseConfigSheet`.",
      { since: "DnD5e 5.0", until: "DnD5e 5.2", once: true }
    );
    super(...args);
  }

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      sheetConfig: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    if ( this.isEditable ) {
      for ( const override of this._getActorOverrides() ) {
        html.find(`input[name="${override}"],select[name="${override}"]`).each((i, el) => {
          el.disabled = true;
          el.dataset.tooltip = "DND5E.ActiveEffectOverrideWarning";
        });
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the list of fields that are currently modified by Active Effects on the Actor.
   * @returns {string[]}
   * @protected
   */
  _getActorOverrides() {
    return Object.keys(foundry.utils.flattenObject(this.object.overrides || {}));
  }

  /* -------------------------------------------- */

  /**
   * Helper method to add choices that have been overridden.
   * @param {string} prefix       The initial form prefix under which the choices are grouped.
   * @param {string} path         Path in actor data.
   * @param {string[]} overrides  The list of fields that are currently modified by Active Effects. *Will be mutated.*
   * @internal
   */
  _addOverriddenChoices(prefix, path, overrides) {
    ActiveEffect5e.addOverriddenChoices(this.document, prefix, path, overrides);
  }
}
