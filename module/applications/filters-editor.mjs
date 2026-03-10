import Application5e from "./api/application.mjs";

/**
 * Application for creating and modifying filters.
 */
export default class FiltersEditor extends Application5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dialog", "filters-editor", "titlebar"],
    id: "filters-editor",
    position: {
      width: 400,
      height: 300
    },
    tag: "dialog",
    value: null,
    window: {
      icon: "fa-solid fa-filter",
      resizable: true,
      minimizable: false
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    editor: {
      template: "systems/dnd5e/templates/apps/filters-editor.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The active CodeMirror editor instance.
   * @type {EditorView}
   */
  #editor;

  /* -------------------------------------------- */

  /**
   * The value of the filters.
   * @type {string}
   */
  get value() {
    return this.#editor.value;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.value = this.options.value;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    this.window.close.classList.remove("fa-xmark");
    this.window.close.classList.add("fa-floppy-disk");
    return frame;
  }

  /* -------------------------------------------- */
  /*  Detached Window API                         */
  /* -------------------------------------------- */

  /** @override */
  _canAttach() {
    return false;
  }

  /* -------------------------------------------- */

  /** @override */
  _canDetach() {
    return false;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @override */
  _canRender(options) {
    if ( this.rendered ) return false;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onFirstRender(context, options) {
    this.element.showModal();
    this.#editor = this.element.querySelector("code-mirror");
  }
}
