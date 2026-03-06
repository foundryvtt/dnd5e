import { generateIcon } from "../../utils.mjs";
import ContextMenu5e from "../context-menu.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * @import { ApplicationContainerParts } from "./_types.mjs";
 */

/**
 * Mixin method for ApplicationV2-based 5e applications.
 * @template {ApplicationV2} T
 * @param {typeof T} Base                      Application class being extended.
 * @param {object} [options={}]
 * @param {boolean} [options.handlebars=true]  Include HandlebarsApplicationMixin.
 * @returns {typeof BaseApplication5e}
 * @mixin
 */
export default function ApplicationV2Mixin(Base, { handlebars=true }={}) {
  const _BaseApplication5e = handlebars ? HandlebarsApplicationMixin(Base) : Base;
  class BaseApplication5e extends _BaseApplication5e {
    /** @override */
    static DEFAULT_OPTIONS = {
      actions: {
        toggleCollapsed: BaseApplication5e.#toggleCollapsed
      },
      classes: ["dnd5e2"],
      window: {
        subtitle: ""
      }
    };

    /* -------------------------------------------- */

    /**
     * @type {Record<string, HandlebarsTemplatePart & ApplicationContainerParts>}
     */
    static PARTS = Base.PARTS ?? {};

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Expanded states for collapsible sections to persist between renders.
     * @type {Map<string, boolean>}
     */
    #expandedSections = new Map();

    get expandedSections() {
      return this.#expandedSections;
    }

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

    /**
     * Translate header controls to context menu entries.
     * @returns {Generator<ContextMenuEntry>}
     * @yields {ContextMenuEntry}
     * @protected
     */
    *_getHeaderControlContextEntries() {
      for ( const { icon, label, action, onClick } of this._headerControlButtons() ) {
        let handler = this.options.actions[action];
        if ( typeof handler === "object" ) {
          if ( handler.buttons && !handler.buttons.includes(0) ) continue;
          handler = handler.handler;
        }
        yield {
          name: label,
          icon: `<i class="${icon}" inert></i>`,
          callback: li => {
            if ( onClick ) onClick(window.event);
            else if ( handler ) handler.call(this, window.event, li);
            else this._onClickAction(window.event, li);
          }
        };
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      this._renderContainers(context, options);
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

    /**
     * Lazily create containers and place parts appropriately.
     * @param {object} context  Render context.
     * @param {object} options  Render options.
     * @protected
     */
    _renderContainers(context, options) {
      const containerElements = Array.from(this.element.querySelectorAll("[data-container-id]"));
      const containers = Object.fromEntries(containerElements.map(el => [el.dataset.containerId, el]));
      for ( const [part, config] of Object.entries(this.constructor.PARTS) ) {
        if ( !config.container?.id ) continue;
        const element = this.element.querySelector(`[data-application-part="${part}"]`);
        if ( !element ) continue;
        let container = containers[config.container.id];
        if ( !container ) {
          const div = document.createElement("div");
          div.dataset.containerId = config.container.id;
          div.classList.add(...config.container.classes ?? []);
          container = containers[config.container.id] = div;
          element.replaceWith(div);
        }
        if ( element.parentElement !== container ) container.append(element);
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      if ( !this.hasFrame ) return frame;

      // Subtitles
      const subtitle = document.createElement("h2");
      subtitle.classList.add("window-subtitle");
      frame?.querySelector(".window-title")?.insertAdjacentElement("afterend", subtitle);

      // Icon
      if ( (options.window?.icon ?? "").includes(".") ) {
        const icon = frame.querySelector(".window-icon");
        icon.replaceWith(generateIcon(options.window.icon, { classes: "window-icon" }));
      }

      return frame;
    }

    /* -------------------------------------------- */

    /**
     * Handle re-rendering the mode toggle on ownership changes.
     * @protected
     */
    _renderModeToggle() {
      const header = this.element.querySelector(".window-header");
      const toggle = header.querySelector(".mode-slider");
      if ( this.isEditable && !toggle ) {
        const toggle = document.createElement("slide-toggle");
        toggle.checked = this.isEditMode;
        toggle.classList.add("mode-slider");
        toggle.dataset.action = "changeMode";
        toggle.dataset.tooltip = "DND5E.SheetModeEdit";
        toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
        toggle.addEventListener("dblclick", event => event.stopPropagation());
        toggle.addEventListener("pointerdown", event => event.stopPropagation());
        header.prepend(toggle);
      } else if ( this.isEditable ) {
        toggle.checked = this.isEditMode;
      } else if ( !this.isEditable && toggle ) {
        toggle.remove();
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _replaceHTML(result, content, options) {
      for ( const part of Object.values(result) ) {
        for ( const element of part.querySelectorAll("[data-expand-id]") ) {
          element.querySelector(".collapsible")?.classList
            .toggle("collapsed", !this.#expandedSections.get(element.dataset.expandId));
        }
      }
      super._replaceHTML(result, content, options);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _updatePosition(position) {
      const pos = super._updatePosition(position);
      const leftOverhang = this.element?.querySelector("nav.tabs.tabs-left")?.offsetWidth ?? 0;
      const rightOverhang = this.element?.querySelector("nav.tabs.tabs-right")?.offsetWidth ?? 0;
      if ( !leftOverhang && !rightOverhang ) return pos;
      const { clientWidth } = this.element.ownerDocument.documentElement;
      const sheetWidth = typeof pos.width === "number" ? pos.width : (this.element?.offsetWidth ?? 0);
      // Clamp left to prevent tabs being moved off-screen when dragged.
      pos.left = Math.clamp(pos.left, leftOverhang, Math.max(clientWidth - sheetWidth - rightOverhang, leftOverhang));
      // Clamp width to prevent tabs being moved off-screen when resized.
      if ( rightOverhang && (typeof pos.width === "number") ) {
        pos.width = Math.min(pos.width, Math.max(clientWidth - pos.left - rightOverhang, 0));
      }
      return pos;
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
    async _onRender(context, options) {
      await super._onRender(context, options);

      this.element.querySelectorAll("[data-context-menu]").forEach(control =>
        control.addEventListener("click", dnd5e.applications.ContextMenu5e.triggerEvent)
      );

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
     * Disable form fields that aren't marked with the `always-interactive` class.
     */
    _disableFields() {
      const selector = `.window-content :is(${[
        "INPUT", "SELECT", "TEXTAREA", "BUTTON", "DND5E-CHECKBOX", "COLOR-PICKER", "DOCUMENT-TAGS",
        "FILE-PICKER", "HUE-SLIDER", "MULTI-SELECT", "PROSE-MIRROR", "RANGE-PICKER", "STRING-TAGS",
        "FORMULA-INPUT"
      ].join(", ")}):not(.always-interactive)`;
      for ( const element of this.element.querySelectorAll(selector) ) {
        if ( element.closest("prose-mirror[open]") ) continue; // Skip active ProseMirror editors
        if ( element.tagName === "TEXTAREA" ) element.readOnly = true;
        else element.disabled = true;
      }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _attachFrameListeners() {
      new ContextMenu5e(this.element, '.header-control[data-action="toggleControls"]', [], {
        eventName: "click", fixed: true, jQuery: false,
        onOpen: () => ui.context.menuItems = Array.from(this._getHeaderControlContextEntries())
      });
      super._attachFrameListeners();
      this.element.addEventListener("plugins", this._onConfigurePlugins.bind(this));
    }

    /* -------------------------------------------- */

    /**
     * Configure plugins for the ProseMirror instance.
     * @param {ProseMirrorPluginsEvent} event
     * @protected
     */
    _onConfigurePlugins(event) {
      event.plugins.highlightDocumentMatches =
        ProseMirror.ProseMirrorHighlightMatchesPlugin.build(ProseMirror.defaultSchema);
    }

    /* -------------------------------------------- */

    /**
     * Edit a Document image. Not restricted to `<img>` elements to allow editing `<dnd5e-icon>` elements.
     * @this {DocumentSheetV2}
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     */
    static async _onEditImage(_event, target) {
      const attr = target.dataset.edit;
      const current = foundry.utils.getProperty(this.document._source, attr);
      const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
      const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
      const fp = new foundry.applications.apps.FilePicker.implementation({
        current,
        type: target.dataset.type || "image",
        redirectToRoot: defaultImage ? [defaultImage] : [],
        callback: path => {
          const isVideo = foundry.helpers.media.VideoHelper.hasVideoExtension(path);
          if ( ((target instanceof HTMLVideoElement) && isVideo)
            || ((target instanceof HTMLImageElement) && !isVideo) ) target.src = path;
          else {
            const repl = document.createElement(isVideo ? "video" : "img");
            Object.assign(repl.dataset, target.dataset);
            if ( isVideo ) Object.assign(repl, {
              autoplay: true, muted: true, disablePictureInPicture: true, loop: true, playsInline: true
            });
            repl.src = path;
            target.replaceWith(repl);
          }

          if ( this.options.form.submitOnChange ) {
            if ( attr.startsWith("token.") ) this.token.update({ [attr.slice(6)]: path });
            else {
              const submit = new Event("submit", { cancelable: true });
              this.form.dispatchEvent(submit);
            }
          }
        },
        position: {
          top: this.position.top + 40,
          left: this.position.left + 10
        },
        document: this.document
      });
      await fp.browse();
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling the collapsed state of collapsible sections.
     * @this {BaseApplication5e}
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     */
    static #toggleCollapsed(event, target) {
      const collapsible = target.closest(".collapsible");
      if ( !collapsible || event.target.closest(".collapsible-content") ) return;
      collapsible.classList.toggle("collapsed");
      this.#expandedSections.set(
        target.closest("[data-expand-id]")?.dataset.expandId,
        !collapsible.classList.contains("collapsed")
      );
    }
  }
  return BaseApplication5e;
}
