const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Mixin method for ApplicationV2-based 5e applications.
 * @param {typeof ApplicationV2} Base   Application class being extended.
 * @returns {class}
 * @mixin
 */
export default Base => class extends HandlebarsApplicationMixin(Base) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2"],
    window: {
      subtitle: ""
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * A reference to the window subtitle.
   * @type {string}
   */
  get subtitle() {
    return game.i18n.localize(this.options.window.subtitle ?? "");
  }

  /* -------------------------------------------- */
  /*  Initialization                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    // Fix focus bug caused by the use of UUIDs in application IDs
    // TODO: Remove once https://github.com/foundryvtt/foundryvtt/issues/11742 is fixed
    applicationOptions.uniqueId = CSS.escape(applicationOptions.uniqueId);
    return applicationOptions;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( options.isFirstRender && this.hasFrame ) {
      options.window ||= {};
      options.window.subtitle ||= this.subtitle;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.CONFIG = CONFIG.DND5E;
    context.inputs = { ...foundry.applications.fields, ...dnd5e.applications.fields };
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    return { ...await super._preparePartContext(partId, context, options) };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);

    // Subtitles
    const subtitle = document.createElement("h2");
    subtitle.classList.add("window-subtitle");
    frame.querySelector(".window-title").insertAdjacentElement("afterend", subtitle);

    // Icon
    if ( (options.window?.icon ?? "").includes(".") ) {
      const icon = frame.querySelector(".window-icon");
      const newIcon = document.createElement(options.window.icon?.endsWith(".svg") ? "dnd5e-icon" : "img");
      newIcon.classList.add("window-icon");
      newIcon.src = options.window.icon;
      icon.replaceWith(newIcon);
    }

    return frame;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _updateFrame(options) {
    super._updateFrame(options);
    if ( options.window && ("subtitle" in options.window) ) {
      this.element.querySelector(".window-header > .window-subtitle").innerText = options.window.subtitle;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    // Allow multi-select tags to be removed when the whole tag is clicked.
    this.element.querySelectorAll("multi-select").forEach(select => {
      if ( select.disabled ) return;
      select.querySelectorAll(".tag").forEach(tag => {
        tag.classList.add("remove");
        tag.querySelector(":scope > span")?.classList.add("remove");
      });
    });

    // Add special styling for label-top hints.
    this.element.querySelectorAll(".label-top > p.hint").forEach(hint => {
      const label = hint.parentElement.querySelector(":scope > label");
      if ( !label ) return;
      hint.ariaLabel = hint.innerText;
      hint.dataset.tooltip = hint.innerHTML;
      hint.innerHTML = "";
      label.insertAdjacentElement("beforeend", hint);
    });
  }

  /* -------------------------------------------- */

  /**
   * Disable form fields that aren't marked with the `interface-only` class.
   */
  _disableFields() {
    const selector = `.window-content :is(${[
      "INPUT", "SELECT", "TEXTAREA", "BUTTON", "DND5E-CHECKBOX", "COLOR-PICKER", "DOCUMENT-TAGS",
      "FILE-PICKER", "HUE-SLIDER", "MULTI-SELECT", "PROSE-MIRROR", "RANGE-PICKER", "STRING-TAGS"
    ].join(", ")}):not(.interface-only)`;
    for ( const element of this.element.querySelectorAll(selector) ) {
      if ( element.tagName === "TEXTAREA" ) element.readOnly = true;
      else element.disabled = true;
    }
  }
};
