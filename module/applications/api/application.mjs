const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base application from which all system applications should be based.
 */
export default class Application5e extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2"],
    window: {
      subtitle: ""
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * A reference to the window subtitle.
   * @type {string}
   */
  get subtitle() {
    return game.i18n.localize(this.options.window.subtitle ?? "");
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
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const subtitle = document.createElement("h2");
    subtitle.classList.add("window-subtitle");
    frame.querySelector(".window-title").insertAdjacentElement("afterend", subtitle);
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
    this.element.querySelectorAll("multi-select").forEach(select => {
      if ( select.disabled ) return;
      select.querySelectorAll(".tag").forEach(tag => {
        tag.classList.add("remove");
        tag.querySelector(":scope > span")?.classList.add("remove");
      });
    });
  }
}
