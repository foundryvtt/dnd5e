import ApplicationV2Mixin from "./api/application-v2-mixin.mjs";

const { ActiveEffectConfig } = foundry.applications.sheets;

/**
 * Extension of the default active effect sheet to add conditional fields & dnd5e styling.
 */
export default class ActiveEffectConfig5e extends ApplicationV2Mixin(ActiveEffectConfig, { handlebars: false }) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["titlebar", "hidden-title"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    details: {
      template: "systems/dnd5e/templates/effects/details.hbs",
      scrollable: [""]
    },
    changes: {
      template: "systems/dnd5e/templates/effects/changes.hbs",
      templates: ["systems/dnd5e/templates/effects/change.hbs"],
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.systemFields = this.document.system.schema.fields;
    context.additionalChangesFields = [];
    await this.document.system.getSheetData?.(context);
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "details": return this._prepareDetailsContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the details tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareDetailsContext(context, options) {
    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  async _renderChange(context) {
    const { change, index } = context;
    if ( typeof change.value !== "string" ) change.value = JSON.stringify(change.value);
    Object.assign(context, {
      collapsed: this.expandedSections.get(`changes.${index}`) ? "" : "collapsed",
      prefix: `system.changes.${index}.`
    });
    Object.assign(
      change,
      ["key", "type", "value", "priority"].reduce((paths, fieldName) => {
        paths[`${fieldName}Path`] = `${context.prefix}${fieldName}`;
        return paths;
      }, {}));
    return ActiveEffect.CHANGE_TYPES[change.type].render?.(context)
      ?? foundry.applications.handlebars.renderTemplate("systems/dnd5e/templates/effects/change.hbs", context);
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector(".sheet-header img").classList.add("document-image");
    this.element.querySelector('.sheet-header [name="name"]').classList.add("document-name");
  }
}
