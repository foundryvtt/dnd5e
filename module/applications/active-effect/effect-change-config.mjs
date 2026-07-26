import { formatNumber } from "../../utils.mjs";
import DocumentSheet5e from "../api/document-sheet.mjs";

/**
 * Application for editing a single active effect change.
 */
export default class EffectChangeConfig extends DocumentSheet5e {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    canImport: false,
    changeId: null,
    classes: ["standard-form", "titlebar"],
    form: {
      closeOnSubmit: true,
      handler: EffectChangeConfig.#handleFormSubmission
    },
    ownershipConfig: false,
    position: {
      width: 500
    },
    sheetConfig: false,
    tag: "form"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/effects/change-config.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The change's source data.
   * @type {object}
   */
  get change() {
    return this.effect.system._source.changes.find(c => c._id === this.options.changeId);
  }

  /* -------------------------------------------- */

  /**
   * Active effect to which this change belongs.
   * @type {ActiveEffect5e}
   */
  get effect() {
    return this.options.document;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    const number = formatNumber(this.effect.system.changes.findIndex(c => c._id === this.options.changeId) + 1);
    return _loc("DND5E.EFFECT.Change.Title", { effect: this.effect.name, number });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _canRender(options) {
    if ( !this.rendered ) return;
    if ( !this.change ) this.close();
    return false;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    options.uniqueId = `${options.uniqueId}-Change-${options.changeId}`;
    return options;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "config": return this._prepareConfigContext(context, options);
      case "footer": return this._prepareFooterContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the config section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareConfigContext(context, options) {
    context.source = this.change;
    context.defaultPriority = ActiveEffect.CHANGE_TYPES[context.source?.type]?.defaultPriority;
    context.fields = this.effect.system.schema.fields.changes.element.fields;

    context.hintText = _loc("DND5E.ACTIVEEFFECT.AttributeKeyTooltip", {
      url: this.effect.type === "enchantment"
        ? "https://github.com/foundryvtt/dnd5e/wiki/Enchantment"
        : "https://github.com/foundryvtt/dnd5e/wiki/Active-Effect-Guide"
    });

    context.typeOptions = Object.entries(ActiveEffect.CHANGE_TYPES)
      .map(([value, { group, label }]) => ({ value, label: _loc(label), group: _loc(
        CONFIG.ActiveEffect.changeTypes[value]?.group
          ?? `DND5E.ACTIVEEFFECT.ChangeType.Group.${value in CONST.ACTIVE_EFFECT_CHANGE_TYPES ? "Standard" : "Custom"}`
      ) }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the footer buttons.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareFooterContext(context, options) {
    context.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "EFFECT.Submit" }];
    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Handle submission of the application.
   * @this {EffectChangeConfig}
   * @param {Event|SubmitEvent} event    The form submission event.
   * @param {HTMLFormElement} form       The submitted form.
   * @param {FormDataExtended} formData  Data from the dialog.
   */
  static #handleFormSubmission(event, form, formData) {
    const changes = this.effect.system.toObject().changes;
    const change = changes.find(c => c._id === this.options.changeId);
    if ( !change ) return;
    foundry.utils.mergeObject(change, foundry.utils.expandObject(formData.object));
    this.effect.update({ "system.changes": changes });
  }
}
