import Application5e from "./application.mjs";

/**
 * Application for creating dnd5e dialogs.
 */
export default class Dialog5e extends Application5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "dialog",
    window: {
      contentTag: "form",
      contentClasses: ["standard-form"],
      minimizable: false
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    content: {
      template: "systems/dnd5e/templates/shared/dialog-content.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Form element within the dialog.
   * @type {HTMLFormElement|void}
   */
  get form() {
    return this.options.tag === "form" ? this.element : this.element.querySelector("form");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = { ...(await super._preparePartContext(partId, context, options)) };
    if ( partId === "content" ) return this._prepareContentContext(context, options);
    if ( partId === "footer" ) return this._prepareFooterContext(context, options);
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the content section.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareContentContext(context, options) {
    context.content = this.options.content ?? "";
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the footer.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareFooterContext(context, options) {
    context.buttons = this.options.buttons?.map(button => ({
      ...button, cssClass: button.class
    }));
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();

    // Add event listeners to the form manually (see https://github.com/foundryvtt/foundryvtt/issues/11621)
    if ( this.options.tag !== "form" ) {
      this.form?.addEventListener("submit", this._onSubmitForm.bind(this, this.options.form));
      this.form?.addEventListener("change", this._onChangeForm.bind(this, this.options.form));
    }
  }
}
