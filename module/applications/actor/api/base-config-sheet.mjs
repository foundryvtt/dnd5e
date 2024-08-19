import ActiveEffect5e from "../../../documents/active-effect.mjs";

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base document sheet from which all system applications should be based.
 */
export default class BaseConfigSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2", "config-sheet"],
    sheetConfig: false,
    form: {
      submitOnChange: true
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.CONFIG = CONFIG.DND5E;
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( !this.isEditable ) return;
    for ( const override of this._getActorOverrides() ) {
      for ( const element of this.element.querySelectorAll(`[name="${override}"]`) ) {
        element.disabled = true;
        element.dataset.tooltip = "DND5E.ActiveEffectOverrideWarning";
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
    return Object.keys(foundry.utils.flattenObject(this.document.overrides || {}));
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
