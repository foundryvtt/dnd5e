import * as Filter from "../filter.mjs";
import SourceField from "../data/shared/source-field.mjs";
import { getPluralRules } from "../utils.mjs";
import Application5e from "./api/application.mjs";
import CompendiumBrowserSettingsConfig from "./settings/compendium-browser-settings.mjs";

/**
 * @typedef {ApplicationConfiguration} CompendiumBrowserConfiguration
 * @property {{locked: CompendiumBrowserFilters, initial: CompendiumBrowserFilters}} filters  Filters to set to start.
 *                                              Locked filters won't be able to be changed by the user. Initial filters
 *                                              will be set to start but can be changed.
 * @property {CompendiumBrowserSelectionConfiguration} selection  Configuration used to define document selections.
 */

/**
 * @typedef {object} CompendiumBrowserSelectionConfiguration
 * @property {number|null} min                  Minimum number of documents that must be selected.
 * @property {number|null} max                  Maximum number of documents that must be selected.
 */

/**
 * @typedef {object} CompendiumBrowserFilters
 * @property {string} [documentClass]  Document type to fetch (e.g. Actor or Item).
 * @property {Set<string>} [types]     Individual document subtypes to filter upon (e.g. "loot", "class", "npc").
 * @property {object} [additional]     Additional type-specific filters applied.
 * @property {FilterDescription[]} [arbitrary]  Additional arbitrary filters to apply, not displayed in the UI.
 *                                     Only available as part of locked filters.
 * @property {string} [name]           A substring to filter by Document name.
 */

/**
 * Filter definition object for additional filters in the Compendium Browser.
 *
 * @typedef {object} CompendiumBrowserFilterDefinitionEntry
 * @property {string} label                                   Localizable label for the filter.
 * @property {"boolean"|"range"|"set"} type                   Type of filter control to display.
 * @property {object} config                                  Type-specific configuration data.
 * @property {CompendiumBrowserCreateFilters} [createFilter]  Method that can be called to create filters.
 */

/**
 * @callback CompendiumBrowserFilterCreateFilters
 * @param {FilterDescription[]} filters                        Array of filters to be applied that should be mutated.
 * @param {*} value                                            Value of the filter.
 * @param {CompendiumBrowserFilterDefinitionEntry} definition  Definition for this filter.
 */

/**
 * @typedef {Map<string, CompendiumBrowserFilterDefinitionEntry>} CompendiumBrowserFilterDefinition
 */

/**
 * Application for browsing, filtering, and searching for content between multiple compendiums.
 * @extends Application5e
 * @template CompendiumBrowserConfiguration
 */
export default class CompendiumBrowser extends Application5e {
  constructor(...args) {
    super(...args);

    this.#filters = this.options.filters?.initial ?? {};

    if ( "mode" in this.options ) {
      this._mode = this.options.mode;
      this._applyModeFilters(this.options.mode);
    }

    if ( foundry.utils.isEmpty(this.options.filters.locked) ) {
      const isAdvanced = this._mode === this.constructor.MODES.ADVANCED;
      const tab = this.constructor.TABS.find(t => t.tab === this.options.tab);
      if ( !tab || (!!tab.advanced !== isAdvanced) ) this.options.tab = isAdvanced ? "actors" : "classes";
      this._applyTabFilters(this.options.tab);
    }
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "compendium-browser-{id}",
    classes: ["compendium-browser", "vertical-tabs", "dialog-lg"],
    tag: "form",
    window: {
      title: "DND5E.CompendiumBrowser.Title",
      minimizable: true,
      resizable: true
    },
    actions: {
      configureSources: CompendiumBrowser.#onConfigureSources,
      clearName: CompendiumBrowser.#onClearName,
      openLink: CompendiumBrowser.#onOpenLink,
      setFilter: CompendiumBrowser.#onSetFilter,
      setType: CompendiumBrowser.#onSetType,
      toggleCollapse: CompendiumBrowser.#onToggleCollapse,
      toggleMode: CompendiumBrowser.#onToggleMode
    },
    form: {
      handler: CompendiumBrowser.#onHandleSubmit,
      closeOnSubmit: true
    },
    position: {
      width: 850,
      height: 700
    },
    filters: {
      locked: {},
      initial: {
        documentClass: "Item",
        types: new Set(["class"])
      }
    },
    selection: {
      min: null,
      max: null
    },
    tab: "classes"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      id: "header",
      classes: ["header"],
      template: "systems/dnd5e/templates/compendium/browser-header.hbs"
    },
    search: {
      id: "sidebar-search",
      classes: ["filter-element"],
      container: { id: "sidebar", classes: ["sidebar", "flexcol"] },
      template: "systems/dnd5e/templates/compendium/browser-sidebar-search.hbs"
    },
    types: {
      id: "sidebar-types",
      container: { id: "sidebar", classes: ["sidebar", "flexcol"] },
      template: "systems/dnd5e/templates/compendium/browser-sidebar-types.hbs"
    },
    filters: {
      id: "sidebar-filters",
      container: { id: "sidebar", classes: ["sidebar", "flexcol"] },
      template: "systems/dnd5e/templates/compendium/browser-sidebar-filters.hbs",
      templates: ["systems/dnd5e/templates/compendium/browser-sidebar-filter-set.hbs"]
    },
    results: {
      id: "results",
      classes: ["results"],
      template: "systems/dnd5e/templates/compendium/browser-results.hbs",
      templates: ["systems/dnd5e/templates/compendium/browser-entry.hbs"],
      scrollable: [""]
    },
    footer: {
      id: "footer",
      classes: ["footer"],
      template: "systems/dnd5e/templates/compendium/browser-footer.hbs"
    },
    tabs: {
      id: "tabs",
      classes: ["tabs", "tabs-left"],
      template: "systems/dnd5e/templates/compendium/browser-tabs.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * @typedef {SheetTabDescriptor5e} CompendiumBrowserTabDescriptor5e
   * @property {string} documentClass  The class of Documents this tab contains.
   * @property {string[]} [types]      The sub-types of Documents this tab contains, otherwise all types of the Document
   *                                   class are assumed.
   * @property {boolean} [advanced]    Is this tab only available in the advanced browsing mode.
   */

  /**
   * Application tabs.
   * @type {CompendiumBrowserTabDescriptor5e[]}
   */
  static TABS = [
    {
      tab: "classes",
      label: "TYPES.Item.classPl",
      svg: "systems/dnd5e/icons/svg/items/class.svg",
      documentClass: "Item",
      types: ["class"]
    },
    {
      tab: "subclasses",
      label: "TYPES.Item.subclassPl",
      svg: "systems/dnd5e/icons/svg/items/subclass.svg",
      documentClass: "Item",
      types: ["subclass"]
    },
    {
      tab: "races",
      label: "TYPES.Item.racePl",
      svg: "systems/dnd5e/icons/svg/items/race.svg",
      documentClass: "Item",
      types: ["race"]
    },
    {
      tab: "feats",
      label: "DND5E.CompendiumBrowser.Tabs.Feat.other",
      icon: "fas fa-star",
      documentClass: "Item",
      types: ["feat"]
    },
    {
      tab: "backgrounds",
      label: "TYPES.Item.backgroundPl",
      svg: "systems/dnd5e/icons/svg/items/background.svg",
      documentClass: "Item",
      types: ["background"]
    },
    {
      tab: "physical",
      label: "DND5E.CompendiumBrowser.Tabs.Item.other",
      svg: "systems/dnd5e/icons/svg/backpack.svg",
      documentClass: "Item",
      types: ["physical"]
    },
    {
      tab: "spells",
      label: "TYPES.Item.spellPl",
      icon: "fas fa-book",
      documentClass: "Item",
      types: ["spell"]
    },
    {
      tab: "monsters",
      label: "DND5E.CompendiumBrowser.Tabs.Monster.other",
      svg: "systems/dnd5e/icons/svg/monster.svg",
      documentClass: "Actor",
      types: ["npc"]
    },
    {
      tab: "vehicles",
      label: "TYPES.Actor.vehiclePl",
      svg: "systems/dnd5e/icons/svg/vehicle.svg",
      documentClass: "Actor",
      types: ["vehicle"]
    },
    {
      tab: "actors",
      label: "DOCUMENT.Actors",
      svg: "systems/dnd5e/icons/svg/monster.svg",
      documentClass: "Actor",
      advanced: true
    },
    {
      tab: "items",
      label: "DOCUMENT.Items",
      svg: "systems/dnd5e/icons/svg/backpack.svg",
      documentClass: "Item",
      advanced: true
    }
  ];

  /* -------------------------------------------- */

  /**
   * Available filtering modes.
   * @enum {number}
   */
  static MODES = {
    BASIC: 1,
    ADVANCED: 2
  };

  /* -------------------------------------------- */

  /**
   * Batching configuration.
   * @type {Record<string, number>}
   */
  static BATCHING = {
    /**
     * The number of pixels before reaching the end of the scroll container to begin loading additional entries.
     */
    MARGIN: 50,

    /**
     * The number of entries to load per batch.
     */
    SIZE: 50
  };

  /* -------------------------------------------- */

  /**
   * The number of milliseconds to delay between user keypresses before executing a search.
   * @type {number}
   */
  static SEARCH_DELAY = 200;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Should the selection controls be displayed?
   * @type {boolean}
   */
  get displaySelection() {
    return !!this.options.selection.min || !!this.options.selection.max;
  }

  /* -------------------------------------------- */

  /**
   * Currently defined filters.
   */
  #filters;

  /**
   * Current filters selected.
   * @type {CompendiumBrowserFilters}
   */
  get currentFilters() {
    const filters = foundry.utils.mergeObject(
      this.#filters,
      this.options.filters.locked,
      { inplace: false }
    );
    filters.documentClass ??= "Item";
    if ( filters.additional?.source ) {
      filters.additional.source = Object.entries(filters.additional.source).reduce((obj, [k, v]) => {
        obj[k.slugify({ strict: true })] = v;
        return obj;
      }, {});
    }
    return filters;
  }

  /* -------------------------------------------- */

  /**
   * Fetched results.
   * @type {Promise<object[]|Document[]>|object[]|Document[]}
   */
  #results;

  /* -------------------------------------------- */

  /**
   * The index of the next result to render as part of batching.
   * @type {number}
   */
  #resultIndex = -1;

  /* -------------------------------------------- */

  /**
   * Whether rendering is currently throttled.
   * @type {boolean}
   */
  #renderThrottle = false;

  /* -------------------------------------------- */

  /**
   * UUIDs of currently selected documents.
   * @type {Set<string>}
   */
  #selected = new Set();

  get selected() {
    return this.#selected;
  }

  /* -------------------------------------------- */

  /**
   * Suffix used for localization selection messages based on min and max values.
   * @type {string|null}
   */
  get #selectionLocalizationSuffix() {
    const max = this.options.selection.max;
    const min = this.options.selection.min;
    if ( !min && !max ) return null;
    if ( !min && max ) return "Max";
    if ( min && !max ) return "Min";
    if ( min !== max ) return "Range";
    return "Single";
  }

  /* -------------------------------------------- */

  /**
   * The cached set of available sources to filter on.
   * @type {Record<string, string>}
   */
  #sources;

  /* -------------------------------------------- */

  /**
   * The mode the browser is currently in.
   * @type {CompendiumBrowser.MODES}
   */
  _mode = this.constructor.MODES.BASIC;

  /* -------------------------------------------- */

  /**
   * The function to invoke when searching results by name.
   * @type {Function}
   */
  _debouncedSearch = foundry.utils.debounce(this._onSearchName.bind(this), this.constructor.SEARCH_DELAY);

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( options.isFirstRender ) {
      const tab = this.constructor.TABS.find(t => t.tab === this.options.tab);
      if ( tab ) foundry.utils.setProperty(options, "dnd5e.browser.types", tab.types);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.filters = this.currentFilters;

    let dataModels = Object.entries(CONFIG[context.filters.documentClass].dataModels);
    if ( context.filters.types?.size ) dataModels = dataModels.filter(([type]) => context.filters.types.has(type));
    context.filterDefinitions = dataModels
      .map(([, d]) => d.compendiumBrowserFilters ?? new Map())
      .reduce((first, second) => {
        if ( !first ) return second;
        return CompendiumBrowser.intersectFilters(first, second);
      }, null) ?? new Map();
    context.filterDefinitions.set("source", {
      label: "DND5E.SOURCE.FIELDS.source.label",
      type: "set",
      config: {
        keyPath: "system.source.slug",
        choices: foundry.utils.mergeObject(
          this.#sources ?? {},
          Object.fromEntries(Object.keys(this.options.filters?.locked?.additional?.source ?? {}).map(k => {
            return [k.slugify({ strict: true }), CONFIG.DND5E.sourceBooks[k] ?? k];
          })), { inplace: false }
        )
      }
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "documentClass":
      case "search":
      case "types":
      case "filters": return this._prepareSidebarContext(partId, context, options);
      case "results": return this._prepareResultsContext(context, options);
      case "footer": return this._prepareFooterContext(context, options);
      case "tabs": return this._prepareTabsContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the footer context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}  Context data for a specific part.
   * @protected
   */
  async _prepareFooterContext(context, options) {
    const value = this.#selected.size;
    const { max, min } = this.options.selection;

    context.displaySelection = this.displaySelection;
    context.invalid = (value < (min || -Infinity)) || (value > (max || Infinity));
    const suffix = this.#selectionLocalizationSuffix;
    context.summary = suffix ? game.i18n.format(
      `DND5E.CompendiumBrowser.Selection.Summary.${suffix}`, { max, min, value }
    ) : value;
    const pr = getPluralRules();
    context.invalidTooltip = game.i18n.format(`DND5E.CompendiumBrowser.Selection.Warning.${suffix}`, {
      max, min, value,
      document: game.i18n.localize(`DND5E.CompendiumBrowser.Selection.Warning.Document.${pr.select(max || min)}`)
    });
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the header context.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    context.showModeToggle = foundry.utils.isEmpty(this.options.filters.locked);
    context.isAdvanced = this._mode === this.constructor.MODES.ADVANCED;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the sidebar context.
   * @param {string} partId                        The part being rendered.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}  Context data for a specific part.
   * @protected
   */
  async _prepareSidebarContext(partId, context, options) {
    context.isLocked = {};
    context.isLocked.filters = ("additional" in this.options.filters.locked);
    context.isLocked.types = ("types" in this.options.filters.locked) || context.isLocked.filters;
    context.isLocked.documentClass = ("documentClass" in this.options.filters.locked) || context.isLocked.types;
    const types = foundry.utils.getProperty(options, "dnd5e.browser.types") ?? [];

    if ( partId === "search" ) {
      context.name = this.#filters.name;
    }

    else if ( partId === "types" ) {
      context.showTypes = (types.length !== 1) || (types[0] === "physical");
      context.types = CONFIG[context.filters.documentClass].documentClass.compendiumBrowserTypes({
        chosen: context.filters.types
      });

      // Special case handling for 'Items' tab in basic mode.
      if ( types[0] === "physical" ) context.types = context.types.physical.children;

      if ( context.isLocked.types ) {
        for ( const [key, value] of Object.entries(context.types) ) {
          if ( !value.children && !value.chosen ) delete context.types[key];
          else if ( value.children ) {
            for ( const [k, v] of Object.entries(value.children) ) {
              if ( !v.chosen ) delete value.children[k];
            }
            if ( foundry.utils.isEmpty(value.children) ) delete context.types[key];
          }
        }
      }
    }

    else if ( partId === "filters" ) {
      context.additional = Array.from(context.filterDefinitions?.entries() ?? []).reduce((arr, [key, data]) => {
        // Special case handling for 'Feats' tab in basic mode.
        if ( (types[0] === "feat") && ((key === "category") || (key === "subtype")) ) return arr;

        let sort = 0;
        switch ( data.type ) {
          case "boolean": sort = 1; break;
          case "range": sort = 2; break;
          case "set": sort = 3; break;
        }

        const generateLocked = data => {
          if ( foundry.utils.getType(data) === "Object" ) {
            return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, generateLocked(v)]));
          }
          return data !== undefined;
        };

        const pushFilter = data => arr.push(foundry.utils.mergeObject(data, {
          key, sort,
          value: context.filters.additional?.[key],
          locked: generateLocked(this.options.filters.locked?.additional?.[key])
        }, { inplace: false }));

        if ( data.type === "set" ) {
          const groups = Object.entries(data.config.choices).reduce((groups, [k, v]) => {
            groups[v.group] ??= {};
            groups[v.group][k] = v;
            return groups;
          }, {});
          if ( Object.keys(groups).length > 1 ) Object.entries(groups).forEach(([group, choices]) => pushFilter({
            ...data,
            collapsed: data.config.collapseGroup?.(group),
            label: game.i18n.format("DND5E.CompendiumBrowser.Filters.Grouped", {
              type: game.i18n.localize(data.label), group
            }),
            config: { ...data.config, choices }
          }));

          else pushFilter({ ...data, collapsed: data.collapseGroup?.(null) });
        }
        else pushFilter(data);

        return arr;
      }, []);

      context.additional.sort((a, b) => a.sort - b.sort);
    }

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the results context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}  Context data for a specific part.
   * @protected
   */
  async _prepareResultsContext(context, options) {
    // TODO: Determine if new set of results need to be fetched, otherwise use old results and re-sort as necessary
    // Sorting changes alone shouldn't require a re-fetch, but any change to filters will
    const filters = CompendiumBrowser.applyFilters(context.filterDefinitions, context.filters.additional);
    // Add the name & arbitrary filters
    if ( this.#filters.name?.length ) filters.push({ k: "name", o: "icontains", v: this.#filters.name });
    if ( context.filters.arbitrary?.length ) filters.push(...context.filters.arbitrary);
    this.#results = CompendiumBrowser.fetch(CONFIG[context.filters.documentClass].documentClass, {
      filters,
      types: context.filters.types,
      indexFields: new Set(["system.source"])
    });
    context.displaySelection = this.displaySelection;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tabs context.
   * @param {ApplicationRenderContext} context  Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareTabsContext(context, options) {
    // If we are locked to a particular filter, do not show tabs.
    if ( !foundry.utils.isEmpty(this.options.filters.locked) ) {
      context.tabs = [];
      return context;
    }

    const advanced = this._mode === this.constructor.MODES.ADVANCED;
    context.tabs = foundry.utils.deepClone(this.constructor.TABS.filter(t => !!t.advanced === advanced));
    const tab = options.isFirstRender ? this.options.tab : this.tabGroups.primary;
    const activeTab = context.tabs.find(t => t.tab === tab) ?? context.tabs[0];
    activeTab.active = true;

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    if ( game.user.isGM ) {
      frame.querySelector('[data-action="close"]').insertAdjacentHTML("beforebegin", `
        <button type="button" class="header-control fas fa-cog icon" data-action="configureSources"
                data-tooltip aria-label="${game.i18n.localize("DND5E.CompendiumBrowser.Sources.Label")}"></button>
      `);
    }
    return frame;
  }

  /* -------------------------------------------- */

  /**
   * Render a single result entry.
   * @param {object|Document} entry  The entry.
   * @param {string} documentClass   The entry's Document class.
   * @returns {Promise<HTMLElement>}
   * @protected
   */
  async _renderResult(entry, documentClass) {
    const { img, name, type, uuid, system } = entry;
    // TODO: Provide more useful subtitles.
    const subtitle = CONFIG[documentClass].typeLabels[type] ?? "";
    const source = system?.source?.value ?? "";
    const context = {
      entry: { img, name, subtitle, uuid, source },
      displaySelection: this.displaySelection,
      selected: this.#selected.has(uuid)
    };
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/compendium/browser-entry.hbs", context
    );
    const template = document.createElement("template");
    template.innerHTML = html;
    const element = template.content.firstElementChild;
    if ( documentClass !== "Item" ) return element;
    element.dataset.tooltip = `
      <section class="loading" data-uuid="${uuid}">
        <i class="fa-solid fa-spinner fa-spin-pulse" inert></i>
      </section>
    `;
    element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
    element.dataset.tooltipDirection ??= "RIGHT";
    return element;
  }

  /* -------------------------------------------- */

  /**
   * Render results once loaded to avoid holding up initial app display.
   * @protected
   */
  async _renderResults() {
    let rendered = [];
    const { documentClass } = this.currentFilters;
    const results = await this.#results;
    this.#results = results;
    const batchEnd = Math.min(this.constructor.BATCHING.SIZE, results.length);
    for ( let i = 0; i < batchEnd; i++ ) {
      rendered.push(this._renderResult(results[i], documentClass));
    }
    this.element.querySelector(".results-loading").hidden = true;
    this.element.querySelector('[data-application-part="results"] .item-list')
      .replaceChildren(...(await Promise.all(rendered)));
    this.#resultIndex = batchEnd;
  }

  /* -------------------------------------------- */

  /**
   * Show a list of applicable source filters for the available results.
   * @protected
   */
  async _renderSourceFilters() {
    const sources = [];
    for ( const result of this.#results ) {
      const source = foundry.utils.getProperty(result, "system.source");
      if ( foundry.utils.getType(source) !== "Object" ) continue;
      const { slug, value } = source;
      sources.push({ slug, value: CONFIG.DND5E.sourceBooks[value] ?? value });
    }
    sources.sort((a, b) => a.value.localeCompare(b.value, game.i18n.lang));
    this.#sources = Object.fromEntries(sources.map(({ slug, value }) => [slug, value]));
    const filters = this.element.querySelector('[data-application-part="filters"]');
    filters.querySelector('[data-filter-id="source"]')?.remove();
    if ( !sources.length ) return;
    const locked = Object.entries(this.options.filters?.locked?.additional?.source ?? {}).reduce((obj, [k, v]) => {
      obj[k.slugify({ strict: true })] = v;
      return obj;
    }, {});
    const filter = await foundry.applications.handlebars.renderTemplate(
      "systems/dnd5e/templates/compendium/browser-sidebar-filter-set.hbs",
      {
        locked,
        value: locked,
        key: "source",
        label: "DND5E.SOURCE.FIELDS.source.label",
        config: { choices: this.#sources }
      }
    );
    filters.insertAdjacentHTML("beforeend", filter);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  changeTab(tab, group, options={}) {
    super.changeTab(tab, group, options);
    const target = this.element.querySelector(`nav.tabs [data-group="${group}"][data-tab="${tab}"]`);
    let { types } = target.dataset;
    types = types ? types.split(",") : [];
    this._applyTabFilters(tab);
    this.render({ parts: ["results", "filters", "types"], dnd5e: { browser: { types } }, changedTab: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("scroll", this._onScrollResults.bind(this), { capture: true, passive: true });
    this.element.addEventListener("dragstart", this._onDragStart.bind(this));
    this.element.addEventListener("keydown", this._debouncedSearch, { passive: true });
    this.element.addEventListener("keydown", this._onKeyAction.bind(this), { passive: true });
    this.element.addEventListener("pointerdown", event => {
      if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
        event.preventDefault();
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if ( partId === "results" ) this._renderResults().then(() => {
      if ( options.isFirstRender || options.changedTab ) this._renderSourceFilters();
    });
    else if ( partId === "types" ) this.#adjustCheckboxStates(htmlElement);
  }

  /* -------------------------------------------- */

  /**
   * Apply filters based on the compendium browser's mode.
   * @param {CompendiumBrowser.MODES} mode  The mode.
   * @protected
   */
  _applyModeFilters(mode) {
    const isAdvanced = mode === this.constructor.MODES.ADVANCED;
    delete this.#filters.types;
    delete this.#filters.additional;
    if ( isAdvanced ) this.#filters.documentClass = "Actor";
    else {
      this.#filters.documentClass = "Item";
      this.#filters.types = new Set(["class"]);
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply filters based on the selected tab.
   * @param {string} id  The tab ID.
   * @protected
   */
  _applyTabFilters(id) {
    const tab = this.constructor.TABS.find(t => t.tab === id);
    if ( !tab ) return;
    const { documentClass, types } = tab;
    delete this.#filters.additional;
    this.#filters.documentClass = documentClass;
    this.#filters.types = new Set(types);

    // Special case handling for 'Items' tab in basic mode.
    if ( id === "physical" ) {
      const physical = Item.implementation.compendiumBrowserTypes().physical.children;
      Object.keys(physical).forEach(this.#filters.types.add, this.#filters.types);
    }

    // Special case handling for 'Feats' tab in basic mode.
    if ( id === "feats" ) this.#filters.additional = { category: { feat: 1 } };
  }

  /* -------------------------------------------- */

  /**
   * Adjust the states of group checkboxes to make then indeterminate if only some of their children are selected.
   * @param {HTMLElement} htmlElement  Element within which to find groups.
   */
  #adjustCheckboxStates(htmlElement) {
    for ( const groupArea of htmlElement.querySelectorAll(".type-group") ) {
      const group = groupArea.querySelector(".type-group-header dnd5e-checkbox");
      const children = groupArea.querySelectorAll(".wrapper dnd5e-checkbox");
      if ( Array.from(children).every(e => e.checked) ) {
        group.checked = true;
        group.indeterminate = false;
      } else {
        group.checked = group.indeterminate = Array.from(children).some(e => e.checked);
      }
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onChangeForm(formConfig, event) {
    if ( event.target.name === "selected" ) {
      if ( event.target.checked ) this.#selected.add(event.target.value);
      else this.#selected.delete(event.target.value);
      event.target.closest(".item").classList.toggle("selected", event.target.checked);
      this.render({ parts: ["footer"] });
    }
    if ( event.target.name?.startsWith("additional.") ) CompendiumBrowser.#onSetFilter.call(this, event, event.target);
  }

  /* -------------------------------------------- */

  /**
   * Handle dragging an entry.
   * @param {DragEvent} event  The drag event.
   * @protected
   */
  _onDragStart(event) {
    const { uuid } = event.target.closest("[data-uuid]")?.dataset ?? {};
    try {
      const { type } = foundry.utils.parseUuid(uuid);
      event.dataTransfer.setData("text/plain", JSON.stringify({ type, uuid }));
    } catch(e) {
      console.error(e);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle triggering an action via keyboard.
   * @param {KeyboardEvent} event  The originating event.
   * @protected
   */
  _onKeyAction(event) {
    const target = event.target.closest("[data-action]");
    if ( (event.key !== " ") || !target ) return;
    const { action } = target.dataset;
    const handler = this.options.actions[action];
    if ( handler ) handler.call(this, event, target);
  }

  /* -------------------------------------------- */

  /**
   * Handle rendering a new batch of results when the user scrolls to the bottom of the list.
   * @param {Event} event  The originating scroll event.
   * @protected
   */
  async _onScrollResults(event) {
    if ( this.#renderThrottle || !event.target.matches('[data-application-part="results"]') ) return;
    if ( (this.#results instanceof Promise) || (this.#resultIndex >= this.#results.length) ) return;
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if ( scrollTop + clientHeight < scrollHeight - this.constructor.BATCHING.MARGIN ) return;
    this.#renderThrottle = true;
    const { documentClass } = this.currentFilters;
    const rendered = [];
    const batchStart = this.#resultIndex;
    const batchEnd = Math.min(batchStart + this.constructor.BATCHING.SIZE, this.#results.length);
    for ( let i = batchStart; i < batchEnd; i++ ) {
      rendered.push(this._renderResult(this.#results[i], documentClass));
    }
    this.element.querySelector('[data-application-part="results"] .item-list').append(...(await Promise.all(rendered)));
    this.#resultIndex = batchEnd;
    this.#renderThrottle = false;
  }

  /* -------------------------------------------- */

  /**
   * Handle searching for a Document by name.
   * @param {KeyboardEvent} event  The triggering event.
   * @protected
   */
  _onSearchName(event) {
    if ( !event.target.matches("search > input") ) return;
    this.#filters.name = event.target.value;
    this.render({ parts: ["results"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle configuring compendium browser sources.
   * @this {CompendiumBrowser}
   */
  static #onConfigureSources() {
    new CompendiumBrowserSettingsConfig().render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing the name filter.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The target of the click event.
   */
  static async #onClearName(event, target) {
    const input = target.closest("search").querySelector(":scope > input");
    input.value = this.#filters.name = "";
    this.render({ parts: ["results"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle form submission with selection.
   * @this {CompendiumBrowser}
   * @param {SubmitEvent} event          The form submission event.
   * @param {HTMLFormElement} form       The submitted form element.
   * @param {FormDataExtended} formData  The data from the submitted form.
   */
  static async #onHandleSubmit(event, form, formData) {
    if ( !this.displaySelection ) return;

    const value = this.#selected.size;
    const { max, min } = this.options.selection;
    if ( (value < (min || -Infinity)) || (value > (max || Infinity)) ) {
      const suffix = this.#selectionLocalizationSuffix;
      const pr = getPluralRules();
      throw new Error(game.i18n.format(`DND5E.CompendiumBrowser.Selection.Warning.${suffix}`, {
        max, min, value,
        document: game.i18n.localize(`DND5E.CompendiumBrowser.Selection.Warning.Document.${pr.select(max || min)}`)
      }));
    }

    /**
     * Hook event that fires when a compendium browser is submitted with selected items.
     * @function dnd5e.compendiumBrowserSelection
     * @memberof hookEvents
     * @param {CompendiumBrowser} browser  Compendium Browser application being submitted.
     * @param {Set<string>} selected       Set of document UUIDs that are selected.
     */
    Hooks.callAll("dnd5e.compendiumBrowserSelection", this, this.#selected);
  }

  /* -------------------------------------------- */

  /**
   * Handle opening a link to an item.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
   */
  static async #onOpenLink(event, target) {
    (await fromUuid(target.closest("[data-uuid]")?.dataset.uuid))?.sheet?.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle setting the document class or a filter.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
   */
  static async #onSetFilter(event, target) {
    const name = target.name;
    const value = target.value;
    const existingValue = foundry.utils.getProperty(this.#filters, name);
    if ( value === existingValue ) return;
    foundry.utils.setProperty(this.#filters, name, value === "" ? undefined : value);

    if ( target.tagName === "BUTTON" ) for ( const button of this.element.querySelectorAll(`[name="${name}"]`) ) {
      button.ariaPressed = button.value === value;
    }

    this.render({ parts: ["results"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle setting a type restriction.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
   */
  static async #onSetType(event, target) {
    this.#filters.types ??= new Set();

    if ( target.defaultValue ) {
      if ( target.checked ) this.#filters.types.add(target.defaultValue);
      else this.#filters.types.delete(target.defaultValue);
      this.#adjustCheckboxStates(target.closest(".sidebar"));
    }

    else {
      target.indeterminate = false;
      for ( const child of target.closest(".type-group").querySelectorAll("dnd5e-checkbox[value]") ) {
        child.checked = target.checked;
        if ( target.checked ) this.#filters.types.add(child.defaultValue);
        else this.#filters.types.delete(child.defaultValue);
      }
    }

    this.render({ parts: ["filters", "results"] });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the collapsed state of a collapsible section.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The capturing HTML element which defined a [data-action].
   */
  static async #onToggleCollapse(event, target) {
    target.closest(".collapsible")?.classList.toggle("collapsed");
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the compendium browser mode.
   * @this {CompendiumBrowser}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The element that was clicked.
   */
  static #onToggleMode(event, target) {
    // TODO: Consider persisting this choice in a client setting.
    this._mode = target.checked ? this.constructor.MODES.ADVANCED : this.constructor.MODES.BASIC;
    const tabs = foundry.utils.deepClone(this.constructor.TABS.filter(t => !!t.advanced === target.checked));
    const activeTab = tabs.find(t => t.tab === this.tabGroups.primary) ?? tabs[0];
    const types = target.checked ? [] : (activeTab?.types ?? ["class"]);
    this._applyModeFilters(this._mode);
    this._applyTabFilters(activeTab?.tab);
    this.render({ parts: ["results", "filters", "types", "tabs"], dnd5e: { browser: { types } }, changedTab: true });
  }

  /* -------------------------------------------- */
  /*  Database Access                             */
  /* -------------------------------------------- */

  /**
   * Retrieve a listing of documents from all compendiums for a specific Document type, with additional filters
   * optionally applied.
   * @param {typeof Document} documentClass  Document type to fetch (e.g. Actor or Item).
   * @param {object} [options={}]
   * @param {Set<string>} [options.types]    Individual document subtypes to filter upon (e.g. "loot", "class", "npc").
   * @param {FilterDescription[]} [options.filters]  Filters to provide further filters.
   * @param {boolean} [options.index=true]   Should only the index for each document be returned, or the whole thing?
   * @param {Set<string>} [options.indexFields]  Key paths for fields to index.
   * @param {boolean|string|Function} [options.sort=true]  Should the contents be sorted? By default sorting will be
   *                                         performed using document names, but a key path can be provided to sort on
   *                                         a specific property or a function to provide more advanced sorting.
   * @returns {object[]|Document[]}
   */
  static async fetch(documentClass, { types=new Set(), filters=[], index=true, indexFields=new Set(), sort=true }={}) {
    // Nothing within containers should be shown
    filters.push({ k: "system.container", o: "in", v: [null, undefined] });

    // If filters are provided, merge their keys with any other fields needing to be indexed
    if ( filters.length ) indexFields = indexFields.union(Filter.uniqueKeys(filters));

    // Do not attempt to index derived fields as this will throw an error server-side.
    indexFields.delete("system.source.slug");

    // Collate compendium sources.
    const sources = CompendiumBrowserSettingsConfig.collateSources();

    // Iterate over all packs
    let documents = game.packs

      // Skip packs that have the wrong document class
      .filter(p => (p.metadata.type === documentClass.metadata.name)

        // Do not show entries inside compendia that are not visible to the current user.
        && p.visible

        && sources.has(p.collection)

        // If types are set and specified in compendium flag, only include those that include the correct types
        && (!types.size || !p.metadata.flags.dnd5e?.types || new Set(p.metadata.flags.dnd5e.types).intersects(types)))

      // Generate an index based on the needed fields
      .map(async p => await Promise.all((await p.getIndex({ fields: Array.from(indexFields) })

        // Apply module art to the new index
        .then(index => game.dnd5e.moduleArt.apply(index)))

        // Derive source values
        .map(i => {
          const source = foundry.utils.getProperty(i, "system.source");
          if ( (foundry.utils.getType(source) === "Object") && i.uuid ) SourceField.prepareData.call(source, i.uuid);
          return i;
        })

        // Remove any documents that don't match the specified types or the provided filters
        .filter(i => (!types.size || types.has(i.type)) && (!filters.length || Filter.performCheck(i, filters)))

        // If full documents are required, retrieve those, otherwise stick with the indices
        .map(async i => index ? i : await fromUuid(i.uuid))
      ));

    // Wait for everything to finish loading and flatten the arrays
    documents = (await Promise.all(documents)).flat();

    if ( sort ) {
      if ( sort === true ) sort = "name";
      const sortFunc = foundry.utils.getType(sort) === "function" ? sort : (lhs, rhs) =>
        String(foundry.utils.getProperty(lhs, sort))
          .localeCompare(String(foundry.utils.getProperty(rhs, sort)), game.i18n.lang);
      documents.sort(sortFunc);
    }

    return documents;
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Factory method used to spawn a compendium browser and wait for the results of a selection.
   * @param {Partial<CompendiumBrowserConfiguration>} [options]
   * @returns {Promise<Set<string>|null>}
   */
  static async select(options={}) {
    return new Promise((resolve, reject) => {
      const browser = new CompendiumBrowser(options);
      browser.addEventListener("close", event => {
        resolve(browser.selected?.size ? browser.selected : null);
      }, { once: true });
      browser.render({ force: true });
    });
  }

  /* -------------------------------------------- */

  /**
   * Factory method used to spawn a compendium browser and return a single selected item or null if canceled.
   * @param {Partial<CompendiumBrowserConfiguration>} [options]
   * @returns {Promise<string|null>}
   */
  static async selectOne(options={}) {
    const result = await this.select(
      foundry.utils.mergeObject(options, { selection: { min: 1, max: 1 } }, { inplace: false })
    );
    return result?.size ? result.first() : null;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Transform filter definition and additional filters values into the final filters to apply.
   * @param {CompendiumBrowserFilterDefinition} definition  Filter definition provided by type.
   * @param {object} values                                 Values of currently selected filters.
   * @returns {FilterDescription[]}
   */
  static applyFilters(definition, values) {
    const filters = [];
    for ( const [key, value] of Object.entries(values ?? {}) ) {
      const def = definition.get(key);
      if ( !def ) continue;
      if ( foundry.utils.getType(def.createFilter) === "function" ) {
        def.createFilter(filters, value, def);
        continue;
      }
      switch ( def.type ) {
        case "boolean":
          if ( value ) filters.push({ k: def.config.keyPath, v: value === 1 });
          break;
        case "range":
          const min = Number(value.min);
          const max = Number(value.max);
          if ( Number.isFinite(min) ) filters.push({ k: def.config.keyPath, o: "gte", v: min });
          if ( Number.isFinite(max) ) filters.push({ k: def.config.keyPath, o: "lte", v: max });
          break;
        case "set":
          const choices = foundry.utils.deepClone(def.config.choices);
          if ( def.config.blank ) choices._blank = "";
          const [positive, negative] = Object.entries(value ?? {}).reduce(([positive, negative], [k, v]) => {
            if ( k in choices ) {
              if ( k === "_blank" ) k = "";
              if ( v === 1 ) positive.push(k);
              else if ( v === -1 ) negative.push(k);
            }
            return [positive, negative];
          }, [[], []]);
          if ( positive.length ) filters.push(
            { k: def.config.keyPath, o: def.config.multiple ? "hasall" : "in", v: positive }
          );
          if ( negative.length ) filters.push(
            { o: "NOT", v: { k: def.config.keyPath, o: def.config.multiple ? "hasany" : "in", v: negative } }
          );
          break;
        default:
          console.warn(`Filter type ${def.type} not handled.`);
          break;
      }
    }
    return filters;
  }

  /* -------------------------------------------- */

  /**
   * Inject the compendium browser button into the compendium sidebar.
   * @param {HTMLElement} html  HTML of the sidebar being rendered.
   */
  static injectSidebarButton(html) {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("open-compendium-browser");
    button.innerHTML = `
      <i class="fa-solid fa-book-open-reader" inert></i>
      ${game.i18n.localize("DND5E.CompendiumBrowser.Action.Open")}
    `;
    button.addEventListener("click", event => (new CompendiumBrowser()).render({ force: true }));

    let headerActions = html.querySelector(".header-actions");
    // FIXME: Workaround for 336 bug. Remove when 337 released.
    if ( !headerActions ) {
      headerActions = document.createElement("div");
      headerActions.className = "header-actions action-buttons flexrow";
      html.querySelector(":scope > header").insertAdjacentElement("afterbegin", headerActions);
    }
    headerActions.append(button);
  }

  /* -------------------------------------------- */

  /**
   * Take two filter sets and find only the filters that match between the two.
   * @param {CompendiumBrowserFilterDefinition} first
   * @param {CompendiumBrowserFilterDefinition>} second
   * @returns {CompendiumBrowserFilterDefinition}
   */
  static intersectFilters(first, second) {
    const final = new Map();

    // Iterate over all keys in first map
    for ( const [key, firstConfig] of first.entries() ) {
      const secondConfig = second.get(key);
      if ( firstConfig.type !== secondConfig?.type ) continue;
      const finalConfig = foundry.utils.deepClone(firstConfig);

      switch ( firstConfig.type ) {
        case "range":
          if ( ("min" in firstConfig.config) || ("min" in secondConfig.config) ) {
            if ( !("min" in firstConfig.config) || !("min" in secondConfig.config) ) continue;
            finalConfig.config.min = Math.max(firstConfig.config.min, secondConfig.config.min);
          }
          if ( ("max" in firstConfig.config) || ("max" in secondConfig.config) ) {
            if ( !("max" in firstConfig.config) || !("max" in secondConfig.config) ) continue;
            finalConfig.config.max = Math.min(firstConfig.config.max, secondConfig.config.max);
          }
          if ( ("min" in finalConfig.config) && ("max" in finalConfig.config)
            && (finalConfig.config.min > finalConfig.config.max) ) continue;
          break;
        case "set":
          Object.keys(finalConfig.config.choices).forEach(k => {
            if ( !(k in secondConfig.config.choices) ) delete finalConfig.config.choices[k];
          });
          if ( foundry.utils.isEmpty(finalConfig.config.choices) ) continue;
          break;
      }

      final.set(key, finalConfig);
    }
    return final;
  }
}
