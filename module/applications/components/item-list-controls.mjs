/**
 * A custom element that encapsulates functionality for sorting, filtering, searching, and grouping lists of items.
 */
export default class ItemListControlsElement extends HTMLElement {
  /** @override */
  connectedCallback() {
    this.#app = ui.windows[this.closest(".app")?.dataset.appid];
    this.#list = this.#app.form.querySelector(`[data-item-list="${this.getAttribute("for")}"]`);
    this.#state = this.#app._filters[this.getAttribute("for")];
    this.#tab = this.closest(".tab")?.dataset.tab;
    this.#buildHTML();

    const debouncedFilter = foundry.utils.debounce(this._onFilterName.bind(this), this.constructor.FILTER_DEBOUNCE_MS);
    this._inputElement.addEventListener("input", debouncedFilter);
    this._controls.clear.addEventListener("click", this._onClearFilters.bind(this));
    this._controls.sort?.addEventListener("click", this._onToggleMode.bind(this));
    this._controls.group?.addEventListener("click", this._onToggleMode.bind(this));

    this._initFilters();
    this._initGrouping();
    this._initSorting();
    this._applyGrouping();
  }

  /* -------------------------------------------- */
  /*  Properties & Getters                        */
  /* -------------------------------------------- */

  /**
   * The amount of time to wait after a user's keypress before the name search filter is applied, in milliseconds.
   * @type {number}
   */
  static FILTER_DEBOUNCE_MS = 200;

  #app;

  /**
   * The Application instance that houses this item control.
   * @type {FormApplication}
   */
  get app() {
    return this.#app;
  }

  #list;

  /**
   * The list element that this element manages.
   * @type {HTMLElement}
   */
  get list() {
    return this.#list;
  }

  #state;

  /**
   * The current filter state.
   * @type {FilterState5e}
   */
  get state() {
    return this.#state;
  }

  #tab;

  /**
   * The tab this element is part of.
   * @type {string}
   */
  get tab() {
    return this.#tab;
  }

  /**
   * The search input.
   * @type {HTMLInputElement}
   * @protected
   */
  _inputElement;

  /**
   * The available filtering choices.
   * @type {NodeListOf<HTMLButtonElement>}
   * @protected
   */
  _filterItems;

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
    return game.user.getFlag("dnd5e", `sheetPrefs.${this.app.object.type}.tabs.${this.tab}`);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Construct the element's internal markup.
   */
  #buildHTML() {
    const options = this.querySelectorAll("option");
    const search = document.createElement("search");
    search.setAttribute("aria-label", this.getAttribute("label"));
    search.innerHTML = `
      <input type="text" placeholder="${this.getAttribute("label")}">
      <ul class="unlist controls">
        <li>
          <button type="button" class="unbutton filter-control" data-action="clear" data-tooltip="DND5E.FilterClear"
                  aria-label="${game.i18n.localize("DND5E.FilterClear")}">
            <i class="fas fa-xmark"></i>        
          </button>
        </li>
        <li class="dropdown">
          <button type="button" class="unbutton filter-control filter" data-action="filter"
                  aria-label="${game.i18n.localize("DND5E.Filter")}">
            <i class="fas fa-filter"></i>
          </button>
          <ul class="filter-list unlist"></ul>
        </li>
      </ul>
    `;

    const controls = search.querySelector(".controls");
    const list = search.querySelector(".filter-list");
    options.forEach(option => {
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="filter-item" data-filter="${option.value}">${option.innerText}</button>
      `;
      list.appendChild(item);
    });

    // Sorting
    if ( this.hasAttribute("sort") ) {
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="unbutton filter-control active" data-action="sort"
                data-tooltip="SIDEBAR.SortModeManual" aria-label="${game.i18n.localize("SIDEBAR.SortModeManual")}">
          <i class="fas fa-arrow-down-short-wide"></i>
        </button>
      `;
      controls.appendChild(item);
    }

    // Grouping
    if ( this.hasAttribute("group") ) {
      const groupLabel = this.getAttribute("group-label");
      const item = document.createElement("li");
      item.innerHTML = `
        <button type="button" class="unbutton filter-control active" data-action="group" data-tooltip="${groupLabel}"
                aria-label="${groupLabel}">
          <i class="fas fa-layer-group"></i>
        </button>
      `;
      controls.appendChild(item);
    }

    this._inputElement = search.querySelector(":scope > input");
    this._filterItems = search.querySelectorAll(".filter-item");
    this._controls = {};
    search.querySelectorAll(".filter-control").forEach(el => this._controls[el.dataset.action] = el);
    this.replaceChildren(search);
  }

  /**
   * Initialize the elements based on the filter state.
   * @protected
   */
  _initFilters() {
    const { properties, name } = this.state;
    this._inputElement.value = name;
    for ( const item of this._filterItems ) {
      item.classList.toggle("active", properties.has(item.dataset.filter));
      item.addEventListener("click", this._onToggleFilterItem.bind(this));
    }
  }

  /* -------------------------------------------- */

  /**
   * Initialize the elements based on the grouping preferences.
   * @protected
   */
  _initGrouping() {
    this._controls.group?.classList.toggle("active", this.prefs?.group !== false);
  }

  /* -------------------------------------------- */

  /**
   * Initialize the element sorting.
   * @protected
   */
  _initSorting() {
    const sortIcon = `fa-${this.prefs?.sort === "a" ? "arrow-down-a-z" : "arrow-down-short-wide"}`;
    this._controls.sort.querySelector("i").className = `fas ${sortIcon}`;
    const label = `SIDEBAR.SortMode${this.prefs?.sort === "a" ? "Alpha" : "Manual"}`;
    this._controls.sort.dataset.tooltip = label;
    this._controls.sort.setAttribute("aria-label", game.i18n.localize(label));
  }

  /* -------------------------------------------- */

  /**
   * Apply the filters to the managed list.
   * @protected
   */
  _applyFilters() {
    const { name, properties } = this.state;
    this._controls.clear.classList.toggle("active", properties.size || name);
    let items = this.app._filterItems?.(this.app.object.items, properties);
    if ( !items ) return;
    if ( name ) items = items.filter(item => item.name.toLocaleLowerCase(game.i18n.lang).includes(name));
    const elementMap = {};
    this.list.querySelectorAll(".items-section").forEach(el => el.hidden = true);
    this.list.querySelectorAll(".item-list .item").forEach(el => {
      elementMap[el.dataset.itemId] = el;
      el.hidden = true;
    });
    for ( const item of items ) {
      const el = elementMap[item.id];
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
      const group = this.prefs?.group !== false;
      const sections = {};
      for ( const section of this.list.querySelectorAll(".items-section") ) {
        sections[section.dataset.type] = section.querySelector(".item-list");
      }
      for ( const item of this.list.querySelectorAll(".item") ) {
        const { grouped, ungrouped } = item.dataset;
        const section = sections[group ? grouped : ungrouped];
        section.appendChild(item);
      }
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
    const sortMode = this.prefs?.sort === "a" ? "a" : "m";
    const comparators = {
      a: (a, b) => a.name.localeCompare(b.name),
      m: (a, b) => a.sort - b.sort
    };
    for ( const section of this.list.querySelectorAll(".items-section .item-list") ) {
      const items = [];
      section.querySelectorAll(".item").forEach(element => {
        const { itemName, itemSort } = element.dataset;
        items.push({ element, name: itemName, sort: Number(itemSort) });
      });
      items.sort(comparators[sortMode]);
      section.replaceChildren(...items.map(({ element }) => element));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a filter item.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onToggleFilterItem(event) {
    const target = event.currentTarget;
    const { properties } = this.state;
    const filter = target.dataset.filter;
    if ( properties.has(filter) ) properties.delete(filter);
    else properties.add(filter);
    target.classList.toggle("active", properties.has(filter));
    this._applyFilters();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the sorting or grouping modes.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  async _onToggleMode(event) {
    const { action } = event.currentTarget.dataset;
    const flag = `sheetPrefs.${this.app.object.type}.tabs.${this.tab}.${action}`;
    const current = game.user.getFlag("dnd5e", flag);
    let value;
    if ( action === "group" ) value = current === false;
    else if ( action === "sort" ) value = current === "a" ? "m" : "a";
    await game.user.setFlag("dnd5e", flag, value);
    if ( action === "group" ) {
      this._initGrouping();
      this._applyGrouping();
    } else if ( action === "sort" ) {
      this._initSorting();
      this._applySorting();
    }
    game.tooltip.deactivate();
  }

  /* -------------------------------------------- */

  /**
   * Handle the user filtering by name.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onFilterName(event) {
    this.state.name = event.target.value.toLocaleLowerCase(game.i18n.lang);
    this._applyFilters();
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing the filters.
   * @protected
   */
  _onClearFilters() {
    this.state.name = this._inputElement.value = "";
    this.state.properties.clear();
    this._filterItems.forEach(el => el.classList.remove("active"));
    this._applyFilters();
  }
}
