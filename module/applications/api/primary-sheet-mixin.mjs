import CheckboxElement from "../components/checkbox.mjs";
import ItemSheet5e from "../item/item-sheet.mjs";
import DragDropApplicationMixin from "../mixins/drag-drop-mixin.mjs";

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

    /**
     * Methods for sorting child embedded items.
     * @type {Record<string, ItemListComparator5e>}
     */
    static SORT_MODES = {
      a: this.sortItemsAlphabetical,
      m: this.sortItemsManual,
      p: this.sortItemsPriority
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
                  data-tooltip aria-label="${game.i18n.localize("DND5E.SOURCE.Action.Configure")}">
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
      context.locked = !this.isEditable;
      context.editable = this.isEditable && (this._mode === this.constructor.MODES.EDIT);
      context.tabs = this._getTabs();
      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      context.tab = context.tabs[partId];

      /**
       * A hook event that fires during preparation of sheet parts.
       * @function dnd5e.prepareSheetContext
       * @memberof hookEvents
       * @param {PrimarySheet5e} sheet  Sheet being rendered.
       * @param {string} partId         The ID of the part being prepared.
       * @param {object} context        Preparation context that should be mutated.
       * @param {object} options        Render options.
       */
      Hooks.callAll("dnd5e.prepareSheetContext", this, partId, context, options);

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

    /** @inheritDoc */
    _toggleDisabled(disabled) {
      super._toggleDisabled(disabled);
      this.element.querySelectorAll(".always-interactive").forEach(input => input.disabled = false);
    }

    /* -------------------------------------------- */
    /*  Life-Cycle Handlers                         */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      if ( this.tabGroups.primary ) this.element.classList.add(`tab-${this.tabGroups.primary}`);

      // Create child button
      if ( this.isEditable ) {
        const button = document.createElement("button");
        button.type = "button";
        button.ariaLabel = game.i18n.localize("CONTROLS.CommonCreate");
        button.classList.add("create-child", "gold-button", "always-interactive");
        button.dataset.action = "addDocument";
        button.innerHTML = '<i class="fas fa-plus" inert></i>';
        this.element.querySelector(".window-content").append(button);
      }
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

      // Prevent inputs from firing drag listeners.
      this.element.querySelectorAll(".draggable input").forEach(el => {
        el.draggable = true;
        el.ondragstart = event => {
          event.preventDefault();
          event.stopPropagation();
        };
      });

      if ( this.isEditable ) {
        // Automatically select input contents when focused
        this.element.querySelectorAll("input").forEach(e => e.addEventListener("focus", e.select));
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
      element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip themed theme-light";
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
      if ( await this._deleteDocument(event, target) === false ) return;
      const uuid = target.closest("[data-uuid]")?.dataset.uuid;
      const doc = await fromUuid(uuid);
      doc?.deleteDialog();
    }

    /* -------------------------------------------- */

    /**
     * Handle removing an document.
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     * @returns {any}               Return `false` to prevent default behavior.
     */
    async _deleteDocument(event, target) {}

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

    /** @override */
    _onRevealSecret(event) {
      if ( super._onRevealSecret(event) ) return;
      const target = event.target.closest("[data-target]")?.dataset.target;
      if ( !target ) return;
      const content = foundry.utils.getProperty(this.document, target);
      const modified = event.target.toggleRevealed(content);
      this.document.update({ [target]: modified });
    }

    /* -------------------------------------------- */

    /**
     * Handle opening a document sheet.
     * @this {PrimarySheet5e}
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     */
    static async #showDocument(event, target) {
      if ( await this._showDocument(event, target) === false ) return;
      if ( [HTMLInputElement, HTMLSelectElement, CheckboxElement].some(el => event.target instanceof el) ) return;
      const uuid = target.closest("[data-uuid]")?.dataset.uuid;
      const doc = await fromUuid(uuid);
      const mode = target.dataset.action === "showDocument" ? "PLAY" : "EDIT";
      doc?.sheet?.render({ force: true, mode: ItemSheet5e.MODES[mode] });
    }

    /* -------------------------------------------- */

    /**
     * Handle opening a document sheet.
     * @param {Event} event         Triggering click event.
     * @param {HTMLElement} target  Button that was clicked.
     * @returns {any}               Return `false` to prevent default behavior.
     */
    async _showDocument(event, target) {}

    /* -------------------------------------------- */
    /*  Sorting                                     */
    /* -------------------------------------------- */

    /**
     * Sort child embedded documents by the given sort mode.
     * @param {string} collection  The embedded collection name.
     * @param {string} mode        The sort mode.
     * @returns {Document[]}
     * @protected
     */
    _sortChildren(collection, mode) {
      return [];
    }

    /* -------------------------------------------- */

    /**
     * Sort Active Effects by the given sort mode.
     * @param {ActiveEffect5e[]} effects  The effects to sort.
     * @param {string} mode               The sort mode.
     * @returns {ActiveEffect5e[]}
     * @protected
     */
    _sortEffects(effects, mode) {
      return effects;
    }

    /* -------------------------------------------- */

    /**
     * Sort Items by the given sort mode.
     * @param {Item5e[]} items  The items to sort.
     * @param {string} mode     The sort mode.
     * @returns {Item5e[]}
     * @protected
     */
    _sortItems(items, mode) {
      const comparator = this.constructor.SORT_MODES[mode] ?? ((a, b) => a.sort - b.sort);
      return items.sort(comparator);
    }

    /* -------------------------------------------- */

    /**
     * Sort Items alphabetically.
     * @param {Item5e} a
     * @param {Item5e} b
     * @returns {number}
     */
    static sortItemsAlphabetical(a, b) {
      return a.name.localeCompare(b.name, game.i18n.lang);
    }

    /* -------------------------------------------- */

    /**
     * Sort Items the way the user arranged them.
     * @param {Item5e} a
     * @param {Item5e} b
     * @returns {number}
     */
    static sortItemsManual(a, b) {
      return a.sort - b.sort;
    }

    /* -------------------------------------------- */

    /**
     * Sort Items by priority
     * @param {Item5e} a
     * @param {Item5e} b
     * @returns {number}
     */
    static sortItemsPriority(a, b) {
      return a.system.linkedActivity?.item?.name.localeCompare(b.system.linkedActivity?.item?.name, game.i18n.lang)
        || ((a.system.level ?? 0) - (b.system.level ?? 0))
        || ((b.system.prepared ?? 0) - (a.system.prepared ?? 0))
        || (a.system.method ?? "").compare(b.system.method ?? "")
        || a.name.localeCompare(b.name, game.i18n.lang);
    }

    /* -------------------------------------------- */
    /*  Drag & Drop                                 */
    /* -------------------------------------------- */

    /** @override */
    _allowedDropBehaviors(event, data) {
      if ( !data?.uuid ) return new Set(["copy", "link"]);
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
      if ( !data?.uuid ) return "copy";
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
