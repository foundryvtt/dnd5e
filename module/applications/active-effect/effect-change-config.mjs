import { formatNumber } from "../../utils.mjs";
import Application5e from "../api/application.mjs";

/**
 * Application for editing a single active effect change.
 */
export default class EffectChangeConfig extends Application5e {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["standard-form"],
    effect: null,
    form: {
      closeOnSubmit: true,
      handler: EffectChangeConfig.#handleFormSubmission
    },
    index: null,
    position: {
      width: 500
    },
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
   * Active effect to which this change belongs.
   */
  get effect() {
    return this.options.effect;
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return _loc("DND5E.EFFECT.Change.Title", {
      effect: this.effect.name, number: formatNumber(this.options.index + 1)
    });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
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
    context.source = this.effect.system._source.changes[this.options.index];
    context.defaultPriority = ActiveEffect.CHANGE_TYPES[context.source.type]?.defaultPriority;
    context.fields = this.effect.system.schema.fields.changes.element.fields;

    context.hintText = _loc("DND5E.ACTIVEEFFECT.AttributeKeyTooltip", {
      url: this.effect.type === "enchantment"
        ? "https://github.com/foundryvtt/dnd5e/wiki/Enchantment"
        : "https://github.com/foundryvtt/dnd5e/wiki/Active-Effect-Guide"
    });

    context.typeOptions = Object.entries(ActiveEffect.CHANGE_TYPES)
      .map(([value, { label }]) => ({ value, label: _loc(label) }))
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
    const submitData = foundry.utils.expandObject(formData.object);
    const changes = this.effect.system.toObject().changes;
    foundry.utils.mergeObject(changes[this.options.index], submitData);
    this.effect.update({ "system.changes": changes });
  }
}
