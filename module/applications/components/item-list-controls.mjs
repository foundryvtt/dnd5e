/**
 * @typedef {object} FilterState5e
 * @property {string} name             Filtering by name.
 * @property {Set<string>} properties  Filtering by some property.
 */

/**
 * @callback ItemListComparator5e
 * @param {Item5e} a
 * @param {Item5e} b
 * @returns {number}
 */

/**
 * @typedef ListControlDescriptor
 * @property {string} key                        A key to identify the option.
 * @property {string} label                      A human-readable label that describes the option.
 * @property {string} [icon]                     Font Awesome icon classes to represent the option.
 * @property {string} [classes]                  CSS classes to apply when the option is active.
 * @property {Record<string, string>} [dataset]  The above properties packed into a dataset for rendering.
 */

/**
 * @typedef ListControlConfiguration
 * @property {string} label                     The placeholder value to use in the main search box.
 * @property {string} list                      The identifier of the item list associated with these controls.
 * @property {ListControlDescriptor[]} filters  Filter configuration.
 * @property {ListControlDescriptor[]} sorting  Sorting configuration.
 * @property {ListControlDescriptor[]} grouping Grouping configuration.
 */

import FilterMenu from "./filter-menu.mjs";

/**
 * A custom element that encapsulates functionality for sorting, filtering, searching, and grouping lists of items.
 */
export default class ItemListControlsElement extends HTMLElement {
  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  /**
   * Well-known controls configurations.
   * @type {Record<string, ListControlConfiguration>}
   */
  static CONFIG = {
    inventory: {
      label: "DND5E.InventorySearch",
      list: "inventory",
      filters: [
        { key: "action", label: "DND5E.Action" },
        { key: "bonus", label: "DND5E.BonusAction" },
        { key: "reaction", label: "DND5E.Reaction" },
        { key: "equipped", label: "DND5E.Equipped" },
        { key: "mgc", label: "DND5E.ITEM.Property.Magical" }
      ],
      sorting: [
        { key: "m", label: "SIDEBAR.SortModeManual", dataset: { icon: "fa-solid fa-arrow-down-short-wide" } },
        { key: "a", label: "SIDEBAR.SortModeAlpha", dataset: { icon: "fa-solid fa-arrow-down-a-z" } }
      ],
      grouping: [
        {
          key: "type",
          label: "DND5E.FilterGroupCategory",
          dataset: { icon: "fa-solid fa-layer-group", classes: "active" }
        },
        { key: "contents", label: "DND5E.FilterGroupCategory", dataset: { icon: "fa-solid fa-layer-group" } }
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The amount of time to wait after a user's keypress before the name search filter is applied, in milliseconds.
   * @type {number}
   */
  static FILTER_DEBOUNCE_MS = 200;

  /**
   * The Application instance that houses this item control.
   * @type {FormApplication}
   */
  get app() {
    return this.#app;
  }

  #app;

  /**
   * The configured filtering options.
   * @type {Record<string, string>}
   */
  get filters() {
    return this.#filters;
  }

  #filters;

  /**
   * The configured grouping modes.
   * @type {Record<string, ListControlDescriptor>}
   */
  #groups;

  /**
   * The managing inventory element.
   * @type {InventoryElement}
   */
  #inventory;

  /**
   * The list element that this element manages.
   * @type {HTMLElement}
   */
  get list() {
    return this.#list;
  }

  #list;

  /**
   * The configured sort modes.
   * @type {Record<string, ListControlDescriptor>}
   */
  #modes;

  /**
   * The current filter state.
   * @type {FilterState5e}
   */
  get state() {
    return this.#state;
  }

  #state;

  /**
   * The tab this element is part of.
   * @type {string}
   */
  get tab() {
    return this.#tab;
  }

  #tab;

  /**
   * The search input.
   * @type {HTMLInputElement}
   * @protected
   */
  _inputElement;

  /**
   * The individual filtering controls.
   * @type {Record<string, HTMLButtonElement>}
   * @protected
   */
  _controls;

  /**
   * The user's preferences for this tab.
   * @type {TabPreferences5e}
   */
  get prefs() {
    return game.user.getFlag("dnd5e", `sheetPrefs.${this.app.document.type}.tabs.${this.tab}`);
  }

  /**
   * Whether to keep empty sections visible.
   * @type {boolean}
   */
  get keepEmpty() {
    return this.hasAttribute("keep-empty");
  }

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    if ( this.#app ) return;
    this.#app = foundry.applications.instances.get(this.closest(".application")?.id);
    const element = this.#app.element;
    this.#list = element.querySelector(`[data-item-list="${this.getAttribute("for")}"]`);
    this.#state = this.#app._filters[this.getAttribute("for")] ??= { name: "", properties: new Set() };
    this.#tab = this.closest(".tab")?.dataset.tab;
    this.#inventory = this.closest(this.#app.options.elements.inventory);

    this.#buildHTML();

    const debouncedFilter = foundry.utils.debounce(this._onFilterName.bind(this), this.constructor.FILTER_DEBOUNCE_MS);
    this._inputElement.addEventListener("input", debouncedFilter);
    this._controls.clear.addEventListener("click", this._onClearFilters.bind(this));
    this._controls.sort?.addEventListener("click", this._onCycleMode.bind(this));
    this._controls.group?.addEventListener("click", this._onCycleMode.bind(this));
    new FilterMenu(this, '.filter-control[data-action="filter"]', [], {
      eventName: "click", jQuery: false, fixed: true
    });

    this._initGrouping();
    this._initSorting();
    this._applyGrouping();
  }

  /* -------------------------------------------- */
  /*  Initialization                              */
  /* -------------------------------------------- */

  /**
   * Construct the element's internal markup.
   */
  #buildHTML() {
    const search = document.createElement("search");
    search.ariaLabel = this.getAttribute("label");
    search.innerHTML = `
      <input type="text" class="always-interactive" placeholder="${this.getAttribute("label")}">
      <ul class="unlist controls">
        <li>
          <button type="button" class="unbutton filter-control always-interactive" data-action="clear"
                  data-tooltip aria-label="${game.i18n.localize("DND5E.FilterClear")}">
            <i class="fas fa-xmark"></i>
          </button>
        </li>
      </ul>
    `;

    const controls = search.querySelector(".controls");

    // Filtering
    this.#filters = Array.from(this.querySelectorAll('[data-list="filters"] option')).reduce((obj, opt) => {
      obj[opt.value] = opt.innerText;
      return obj;
    }, {});
    if ( !foundry.utils.isEmpty(this.#filters) ) {
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="unbutton filter-control filter always-interactive" data-action="filter"
                aria-label="${game.i18n.localize("DND5E.Filter")}">
          <i class="fa-solid fa-filter" inert></i>
        </button>
      `;
      controls.append(item);
    }

    // Sorting
    this.#modes = this.#parseControlOptions("sort");
    if ( !foundry.utils.isEmpty(this.#modes) ) {
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="unbutton filter-control active always-interactive" data-action="sort">
          <i inert></i>
        </button>
      `;
      controls.append(item);
    }

    // Grouping
    this.#groups = this.#parseControlOptions("group");
    if ( !foundry.utils.isEmpty(this.#groups) ) {
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="unbutton filter-control always-interactive" data-action="group">
          <i inert></i>
        </button>
      `;
      controls.append(item);
    }

    this._inputElement = search.querySelector(":scope > input");
    if ( this.state?.name ) this._inputElement.value = this.state.name;
    this._controls = Array.from(search.querySelectorAll(".filter-control")).reduce((obj, el) => {
      obj[el.dataset.action] = el;
      return obj;
    }, {});
    this.replaceChildren(search);
  }

  /* -------------------------------------------- */

  /**
   * Initialize controls based on grouping preferences.
   * @protected
   */
  _initGrouping() {
    const { group } = this._controls;
    if ( !group ) return;
    let key = this.prefs?.group;
    if ( !(key in this.#groups) ) key = Object.keys(this.#groups)[0];
    const { label, icon, classes } = this.#groups[key] ?? {};
    group.ariaLabel = label;
    group.dataset.tooltip = label;
    group.className = `unbutton filter-control always-interactive ${classes ?? ""}`;
    group.querySelector(":scope > i").className = icon;
  }

  /* -------------------------------------------- */

  /**
   * Initialize controls based on sorting preferences.
   * @protected
   */
  _initSorting() {
    const { sort } = this._controls;
    if ( !sort ) return;
    let key = this.prefs?.sort;
    if ( !(key in this.#modes) ) key = Object.keys(this.#modes)[0];
    const { label, icon, classes } = this.#modes[key] ?? {};
    sort.ariaLabel = label;
    sort.dataset.tooltip = label;
    sort.className = `unbutton filter-control always-interactive active ${classes ?? ""}`;
    sort.querySelector(":scope > i").className = icon;
  }

  /* -------------------------------------------- */

  /**
   * Parse configuration markup for this element.
   * @param {string} list  The configuration to parse.
   * @returns {Record<string, ListControlDescriptor>}
   */
  #parseControlOptions(list) {
    return Array.from(this.querySelectorAll(`[data-list="${list}"] option`)).reduce((obj, opt) => {
      const descriptor = { key: opt.value, label: opt.innerText, icon: opt.dataset.icon };
      if ( "classes" in opt.dataset ) descriptor.classes = opt.dataset.classes;
      obj[opt.value] = descriptor;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Filtering, Grouping, & Sorting              */
  /* -------------------------------------------- */

  /**
   * Apply the filters to the managed list.
   * @internal
   */
  _applyFilters() {
    const { name, properties } = this.state;
    this._controls.clear.classList.toggle("active", properties.size || name);
    this._controls.filter?.classList.toggle("active", properties.size);
    let entries = this.app._filterChildren?.(this.getAttribute("collection") ?? "items", properties);
    if ( !entries ) return;
    if ( name ) entries = entries.filter(item => item.name.toLocaleLowerCase(game.i18n.lang).includes(name));
    const elementMap = {};
    if ( !this.keepEmpty ) this.list.querySelectorAll(".items-section").forEach(el => el.hidden = true);
    this.list.querySelectorAll(".item-list .item").forEach(el => {
      const uniqueID = el.dataset.parentId ? `${el.dataset.parentId}.${el.dataset.entryId}` : el.dataset.entryId;
      elementMap[uniqueID] = el;
      el.hidden = true;
    });
    for ( const entry of entries ) {
      const el = elementMap[`${entry.parent?.id}.${entry.id}`] ?? elementMap[entry.id];
      if ( el ) el.hidden = false;
    }
    this.list.querySelectorAll(".items-section:has(.item-list .item:not([hidden]))").forEach(el => el.hidden = false);
  }

  /* -------------------------------------------- */

  /**
   * Group the managed items.
   * @protected
   */
  _applyGrouping() {
    if ( this._controls.group ) {
      let key = this.prefs?.group;
      if ( !(key in this.#groups) ) key = Object.keys(this.#groups)[0];
      const columns = {};
      const sections = {};
      for ( const section of this.list.querySelectorAll(`.items-section[data-group-${key}]`) ) {
        const group = section.getAttribute(`data-group-${key}`);
        sections[group] = section.querySelector(".item-list");
        columns[group] = Array.from(section.querySelectorAll(".items-header [data-column-id]")).reduce((set, el) => {
          set.add(el.dataset.columnId);
          return set;
        }, new Set());
      }
      for ( const item of this.list.querySelectorAll(".item") ) {
        const group = item.getAttribute(`data-group-${key}`);
        const cols = columns[group];
        if ( cols ) {
          item.querySelectorAll("[data-column-id]").forEach(col => {
            col.classList.toggle("hidden-column", !cols.has(col.dataset.columnId));
          });
        }
        sections[group]?.append(item);
      }
      this.#inventory?._cacheSections?.();
    }
    this._applyFilters();
    this._applySorting();
  }

  /* -------------------------------------------- */

  /**
   * Sort the managed list.
   * @protected
   */
  _applySorting() {
    let sort = this.prefs?.sort;
    if ( !(sort in this.#modes) ) sort = Object.keys(this.#modes)[0];
    const entries = this.app._sortChildren?.(this.getAttribute("collection") ?? "items", sort);
    const elementMap = {};
    this.list.querySelectorAll(".item-list .item").forEach(el => {
      const uniqueID = el.dataset.parentId ? `${el.dataset.parentId}.${el.dataset.entryId}` : el.dataset.entryId;
      elementMap[uniqueID] = el;
    });
    for ( const entry of entries ) {
      const el = elementMap[`${entry.parent?.id}.${entry.id}`] ?? elementMap[entry.id];
      if ( el ) el.parentElement.append(el);
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle clearing all filters.
   * @protected
   */
  _onClearFilters() {
    this.state.name = this._inputElement.value = "";
    this.state.properties.clear();
    this._applyFilters();
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling through the sorting or grouping modes.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  async _onCycleMode(event) {
    const { action } = event.currentTarget.dataset;
    const flag = `sheetPrefs.${this.app.document.type}.tabs.${this.tab}.${action}`;
    const modes = Object.keys(action === "group" ? this.#groups : this.#modes);
    const current = Math.max(0, modes.indexOf(game.user.getFlag("dnd5e", flag)));
    await game.user.setFlag("dnd5e", flag, modes[(current + 1) % modes.length]);
    if ( action === "group" ) {
      this._initGrouping();
      this._applyGrouping();
    } else {
      this._initSorting();
      this._applySorting();
    }
    game.tooltip.deactivate();
  }

  /* -------------------------------------------- */

  /**
   * Handle the user filtering by name.
   * @param {KeyboardEvent} event  The triggering event.
   * @protected
   */
  _onFilterName(event) {
    this.state.name = event.target.value.toLocaleLowerCase(game.i18n.lang);
    this._applyFilters();
  }
}
