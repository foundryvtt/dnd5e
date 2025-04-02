import { parseInputDelta } from "../../utils.mjs";
import ItemSheet5e from "../item/item-sheet.mjs";
import DragDropApplicationMixin from "../mixins/drag-drop-mixin.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * @import { FilterState5e } from "../components/item-list-controls.mjs";
 */

/**
 * Adds V2 sheet functionality shared between primary document sheets (Actors & Items).
 * @param {typeof DocumentSheet5e} Base  The base class being mixed.
 * @returns {typeof PrimarySheet5e}
 */
export default function PrimarySheetMixin(Base) {
  return class PrimarySheet5e extends DragDropApplicationMixin(Base) {
    /** @override */
    static DEFAULT_OPTIONS = {
      actions: {
        editDocument: PrimarySheet5e.#showDocument,
        deleteDocument: PrimarySheet5e.#deleteDocument,
        showDocument: PrimarySheet5e.#showDocument
      }
    };

    /* -------------------------------------------- */

    /**
     * @typedef {object} SheetTabDescriptor5e
     * @property {string} tab                       The tab key.
     * @property {string} label                     The tab label's localization key.
     * @property {string} [icon]                    A font-awesome icon.
     * @property {string} [svg]                     An SVG icon.
     * @property {SheetTabCondition5e} [condition]  A predicate to check before rendering the tab.
     */

    /**
     * @callback SheetTabCondition5e
     * @param {Document} doc  The Document instance.
     * @returns {boolean}     Whether to render the tab.
     */

    /**
     * Sheet tabs.
     * @type {SheetTabDescriptor5e[]}
     */
    static TABS = [];

    /* -------------------------------------------- */

    /**
     * Available sheet modes.
     * @enum {number}
     */
    static MODES = {
      PLAY: 1,
      EDIT: 2
    };

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * Filters for applied inventory sections.
     * @type {Record<string, FilterState5e>}
     */
    _filters = {};

    /* -------------------------------------------- */

    /**
     * The mode the sheet is currently in.
     * @type {PrimarySheet5e.MODES|null}
     * @protected
     */
    _mode = null;

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _attachFrameListeners() {
      new ContextMenu5e(this.element, '.header-control[data-action="toggleControls"]', [], {
        eventName: "click", fixed: true, jQuery: false,
        onOpen: () => ui.context.menuItems = Array.from(this._getHeaderControlContextEntries())
      });
      super._attachFrameListeners();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderOptions(options) {
      super._configureRenderOptions(options);

      // Set initial mode
      let { mode, renderContext } = options;
      if ( (mode === undefined) && (renderContext === "createItem") ) mode = this.constructor.MODES.EDIT;
      this._mode = mode ?? this._mode ?? this.constructor.MODES.PLAY;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      for ( const key of Object.keys(parts) ) {
        const tab = this.constructor.TABS.find(t => t.tab === key);
        if ( tab?.condition && !tab.condition(this.document) ) delete parts[key];
      }
      return parts;
    }

    /* -------------------------------------------- */

    /**
     * Translate header controls to context menu entries.
     * @returns {Generator<ContextMenuEntry>}
     * @yields {ContextMenuEntry}
     * @protected
     */
    *_getHeaderControlContextEntries() {
      for ( const { icon, label, action } of this._headerControlButtons() ) {
        let handler = this.options.actions[action];
        if ( typeof handler === "object" ) {
          if ( handler.buttons && !handler.buttons.includes(0) ) continue;
          handler = handler.handler;
        }
        yield {
          name: label,
          icon: `<i class="${icon}" inert></i>`,
          callback: li => {
            if ( handler ) handler.call(this, window.event, li);
            else this._onClickAction(window.event, li);
          }
        };
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderFrame(options) {
      const html = await super._renderFrame(options);
      if ( !game.user.isGM && this.document.limited ) html.classList.add("limited");
      return html;
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
        toggle.checked = this._mode === this.constructor.MODES.EDIT;
        toggle.classList.add("mode-slider");
        toggle.dataset.tooltip = "DND5E.SheetModeEdit";
        toggle.setAttribute("aria-label", game.i18n.localize("DND5E.SheetModeEdit"));
        toggle.addEventListener("change", this._onChangeSheetMode.bind(this));
        toggle.addEventListener("dblclick", event => event.stopPropagation());
        toggle.addEventListener("pointerdown", event => event.stopPropagation());
        header.prepend(toggle);
      } else if ( this.isEditable ) {
        toggle.checked = this._mode === this.constructor.MODES.EDIT;
      } else if ( !this.isEditable && toggle ) {
        toggle.remove();
      }
    }

    /* -------------------------------------------- */

    /**
     * Render source information in the Document's title bar.
     * @param {HTMLElement} html  The outer frame HTML.
     * @protected
     */
    _renderSourceFrame(html) {
      const elements = document.createElement("div");
      elements.classList.add("header-elements");
      elements.innerHTML = `
        <div class="source-book">
          <button type="button" class="unbutton control-button" data-action="showConfiguration" data-config="source"
                  data-tooltip="DND5E.SOURCE.Action.Configure"
                  aria-label="${game.i18n.localize("DND5E.SOURCE.Action.Configure")}">
            <i class="fas fa-cog" inert></i>
          </button>
          <span></span>
        </div>
      `;
      html.querySelector(".window-subtitle")?.after(elements);
    }

    /* -------------------------------------------- */

    /**
     * Update the source information when re-rendering the sheet.
     * @protected
     */
    _renderSource() {
      const elements = this.element.querySelector(".header-elements .source-book");
      const source = this.document?.system.source;
      if ( !elements || !source ) return;
      const editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      elements.querySelector("button")?.toggleAttribute("hidden", !editable);
      elements.querySelector("span").innerText = editable
        ? (source.label || game.i18n.localize("DND5E.SOURCE.FIELDS.source.label"))
        : source.label;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.owner = this.document.isOwner;
      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.tabs = this._getTabs();
      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, options) {
      const context = await super._preparePartContext(partId, options);
      context.tab = context.tabs[partId];
      return context;
    }

    /* -------------------------------------------- */

    /**
     * Prepare the tab information for the sheet.
     * @returns {Record<string, Partial<ApplicationTab>>}
     * @protected
     */
    _getTabs() {
      return this.constructor.TABS.reduce((tabs, { tab, condition, ...config }) => {
        if ( !condition || condition(this.document) ) tabs[tab] = {
          ...config,
          id: tab,
          group: "primary",
          active: this.tabGroups.primary === tab,
          cssClass: this.tabGroups.primary === tab ? "active" : ""
        };
        return tabs;
      }, {});
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      if ( this.tabGroups.primary ) this.element.classList.add(`tab-${this.tabGroups.primary}`);

      // Create child button
      const button = document.createElement("button");
      button.type = "button";
      button.ariaLabel = game.i18n.localize("CONTROLS.CommonCreate");
      button.classList.add("create-child", "gold-button", "always-interactive");
      button.dataset.action = "addDocument";
      button.innerHTML = '<i class="fas fa-plus" inert></i>';
      this.element.querySelector(".window-content").append(button);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);

      // Set toggle state and add status class to frame
      this._renderModeToggle();
      this.element.classList.toggle("editable", this.isEditable && (this._mode === this.constructor.MODES.EDIT));
      this.element.classList.toggle("interactable", this.isEditable && (this._mode === this.constructor.MODES.PLAY));
      this.element.classList.toggle("locked", !this.isEditable);

      // Add event listeners
      this.element.querySelectorAll(".item-tooltip").forEach(this._applyItemTooltips.bind(this));

      if ( this.isEditable ) {
        // Automatically select input contents when focused
        this.element.querySelectorAll("input").forEach(e => e.addEventListener("focus", e.select));

        // Handle delta inputs
        this.element.querySelectorAll('input[type="text"][data-dtype="Number"]')
          .forEach(i => i.addEventListener("change", this._onChangeInputDelta.bind(this)));
      }
    }

    /* -------------------------------------------- */
    /*  Event Listeners & Handlers                  */
    /* -------------------------------------------- */

    /**
     * Handle creating a new embedded child.
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     * @returns {any}
     * @protected
     * @abstract
     */
    _addDocument(event, target) {}

    /* -------------------------------------------- */

    /**
     * Initialize item tooltips on an element.
     * @param {HTMLElement} element  The tooltipped element.
     * @protected
     */
    _applyItemTooltips(element) {
      if ( "tooltip" in element.dataset ) return;
      const target = element.closest("[data-item-id], [data-effect-id], [data-uuid]");
      let uuid = target.dataset.uuid;
      if ( !uuid && target.dataset.itemId ) {
        const item = this.actor?.items.get(target.dataset.itemId);
        uuid = item?.uuid;
      } else if ( !uuid && target.dataset.effectId ) {
        const { effectId, parentId } = target.dataset;
        const collection = parentId ? this.actor?.items.get(parentId).effects : this.actor?.effects;
        uuid = collection?.get(effectId)?.uuid;
      }
      if ( !uuid ) return;
      element.dataset.tooltip = `
        <section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse"></i></section>
      `;
      element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
      element.dataset.tooltipDirection ??= "LEFT";
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    changeTab(tab, group, options) {
      super.changeTab(tab, group, options);
      if ( group !== "primary" ) return;
      this.element.className = this.element.className.replace(/tab-\w+/g, "");
      this.element.classList.add(`tab-${tab}`);
    }

    /* -------------------------------------------- */

    /**
     * Handle removing an document.
     * @this {PrimarySheet5e}
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     */
    static async #deleteDocument(event, target) {
      if ( await this._deleteDocument(event, target) !== false ) return;
      const uuid = target.closest("[data-uuid]").dataset?.uuid;
      const doc = await fromUuid(uuid);
      doc?.deleteDialog();
    }

    /**
     * Handle removing an document.
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     * @returns {any}               Return `false` to continue with base sheet's options.
     */
    async _deleteDocument(event, target) {
      return false;
    }

    /* -------------------------------------------- */

    /**
     * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
     * @param {Event} event  Triggering event.
     * @protected
     */
    _onChangeInputDelta(event) {
      const input = event.target;
      const target = this.actor.items.get(input.closest("[data-item-id]")?.dataset.itemId) ?? this.actor;
      const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
      const activity = target?.system.activities?.get(activityId);
      const result = parseInputDelta(input, activity ?? target);
      if ( result !== undefined ) {
        // Special case handling for Item uses.
        if ( input.dataset.name === "system.uses.value" ) {
          target.update({ "system.uses.spent": target.system.uses.max - result });
        } else if ( activity && (input.dataset.name === "uses.value") ) {
          target.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
        }
        else target.update({ [input.dataset.name]: result });
      }
    }

    /* -------------------------------------------- */

    /**
     * Handle the user toggling the sheet mode.
     * @param {Event} event  The triggering event.
     * @protected
     */
    async _onChangeSheetMode(event) {
      const { MODES } = this.constructor;
      const toggle = event.currentTarget;
      const label = game.i18n.localize(`DND5E.SheetMode${toggle.checked ? "Play" : "Edit"}`);
      toggle.dataset.tooltip = label;
      toggle.setAttribute("aria-label", label);
      this._mode = toggle.checked ? MODES.EDIT : MODES.PLAY;
      await this.submit();
      this.render();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _onClickAction(event, target) {
      if ( target.dataset.action === "addDocument" ) this._addDocument(event, target);
      else super._onClickAction(event, target);
    }

    /* -------------------------------------------- */

    /**
     * Handle opening a document sheet.
     * @this {PrimarySheet5e}
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     */
    static async #showDocument(event, target) {
      if ( await this._showDocument(event, target) !== false ) return;
      const uuid = target.closest("[data-uuid]")?.dataset.uuid;
      const doc = await fromUuid(uuid);
      const mode = target.dataset.action === "showDocument" ? "PLAY" : "EDIT";
      doc?.sheet?.render({ force: true, mode: ItemSheet5e2.MODES[mode] });
    }

    /**
     * Handle opening a document sheet.
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     * @returns {any}               Return `false` to continue with base sheet's options.
     */
    async _showDocument(event, target) {
      return false;
    }

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    /** @override */
    _allowedDropBehaviors(event, data) {
      if ( !data.uuid ) return new Set(["copy", "link"]);
      const allowed = new Set(["copy", "move", "link"]);
      const s = foundry.utils.parseUuid(data.uuid);
      const t = foundry.utils.parseUuid(this.document.uuid);
      const sCompendium = s.collection instanceof foundry.documents.collections.CompendiumCollection;
      const tCompendium = t.collection instanceof foundry.documents.collections.CompendiumCollection;

      // If either source or target are within a compendium, but not inside the same compendium, move not allowed
      if ( (sCompendium || tCompendium) && (s.collection !== t.collection) ) allowed.delete("move");

      return allowed;
    }

    /* -------------------------------------------- */

    /** @override */
    _defaultDropBehavior(event, data) {
      if ( !data.uuid ) return "copy";
      const d = foundry.utils.parseUuid(data.uuid);
      const t = foundry.utils.parseUuid(this.document.uuid);
      const base = d.embedded?.length ? "document" : "primary";
      return (d.collection === t.collection) && (d[`${base}Id`] === t[`${base}Id`])
        && (d[`${base}Type`] === t[`${base}Type`]) ? "move" : "copy";
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDragStart(event) {
      await super._onDragStart(event);
      if ( !this.document.isOwner || this.document.collection?.locked ) {
        event.dataTransfer.effectAllowed = "copyLink";
      }
    }
  };
}
