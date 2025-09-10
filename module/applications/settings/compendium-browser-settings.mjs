import Application5e from "../api/application.mjs";

/**
 * @typedef {ApplicationConfiguration} CompendiumBrowserSourceConfiguration
 * @property {string} [selected]  The initially-selected package.
 */

/**
 * @typedef CompendiumSourceConfig5e
 * @property {object} packages
 * @property {CompendiumSourcePackageConfig5e} packages.world
 * @property {CompendiumSourcePackageConfig5e} packages.system
 * @property {Record<string, CompendiumSourcePackageConfig5e>} packages.modules
 * @property {object} packs
 * @property {CompendiumSourcePackGroup5e} packs.items
 * @property {CompendiumSourcePackGroup5e} packs.actors
 */

/**
 * @typedef CompendiumSourcePackageConfig5e
 * @property {string} title           The package title.
 * @property {string} id              The package ID.
 * @property {number} count           The number of packs provided by this package.
 * @property {boolean} checked        True if all the packs are included.
 * @property {boolean} indeterminate  True if only some of the packs are included.
 * @property {boolean} active         True if the package is currently selected.
 * @property {string} filter          The normalized package title for filtering.
 */

/**
 * @typedef CompendiumSourcePackGroup5e
 * @property {boolean} checked        True if all members of this pack group are included.
 * @property {boolean} indeterminate  True if only some of this pack group are included.
 * @property {CompendiumSourcePackConfig5e[]} entries
 */

/**
 * @typedef CompendiumSourcePackConfig5e
 * @property {string} title     The pack title.
 * @property {string} id        The pack ID.
 * @property {boolean} checked  True if the pack is included.
 */

/**
 * An application for configuring which compendium packs contribute their content to the compendium browser.
 * @extends Application5e<CompendiumBrowserSourceConfiguration>
 */
export default class CompendiumBrowserSettingsConfig extends Application5e {
  constructor(options) {
    super(options);
    this.#selected = this.options.selected;
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "compendium-browser-source-config",
    classes: ["dialog-lg"],
    tag: "form",
    window: {
      title: "DND5E.CompendiumBrowser.Sources.Label",
      icon: "fas fa-book-open-reader",
      resizable: true
    },
    position: {
      width: 800,
      height: 650
    },
    actions: {
      clearFilter: CompendiumBrowserSettingsConfig.#onClearPackageFilter,
      selectPackage: CompendiumBrowserSettingsConfig.#onSelectPackage
    },
    selected: "system"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    sidebar: {
      id: "sidebar",
      template: "systems/dnd5e/templates/compendium/sources-sidebar.hbs"
    },
    packs: {
      id: "packs",
      template: "systems/dnd5e/templates/compendium/sources-packs.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * The number of milliseconds to delay between user keypresses before executing the package filter.
   * @type {number}
   */
  static FILTER_DELAY = 200;

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The current package filter.
   * @type {string}
   */
  #filter = "";

  /* -------------------------------------------- */

  /**
   * The currently selected package.
   * @type {string}
   */
  #selected;

  /* -------------------------------------------- */

  _debouncedFilter = foundry.utils.debounce(this._onFilterPackages.bind(this), this.constructor.FILTER_DELAY);

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const sources = this.constructor.collateSources();
    const byPackage = { world: new Set(), system: new Set() };

    for ( const { collection, documentName, metadata } of game.packs ) {
      if ( (documentName !== "Actor") && (documentName !== "Item") ) continue;
      let entry;
      if ( (metadata.packageType === "world") || (metadata.packageType === "system") ) {
        entry = byPackage[metadata.packageType];
      }
      else entry = byPackage[`module.${metadata.packageName}`] ??= new Set();
      entry.add(collection);
    }

    const packages = { };
    packages.world = this._preparePackageContext("world", game.world, byPackage.world, sources);
    packages.system = this._preparePackageContext("system", game.system, byPackage.system, sources);

    const modules = Object.entries(byPackage).reduce((arr, [k, packs]) => {
      if ( (k === "world") || (k === "system") ) return arr;
      const id = k.slice(7);
      const module = game.modules.get(id);
      arr.push(this._preparePackageContext(k, module, packs, sources));
      return arr;
    }, []);
    modules.sort((a, b) => a.title.localeCompare(b.title, game.i18n.lang));
    packages.modules = Object.fromEntries(modules.map(m => [m.id, m]));

    const packs = { actors: {}, items: {} };
    [["actors", "Actor"], ["items", "Item"]].forEach(([p, type]) => {
      packs[p] = this._preparePackGroupContext(type, byPackage[this.#selected], sources);
    });

    return {
      ...await super._prepareContext(options),
      packages, packs,
      filter: this.#filter
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for packages.
   * @param {string} id            The package identifier.
   * @param {ClientPackage} pkg    The package.
   * @param {Set<string>} packs    The packs belonging to this package.
   * @param {Set<string>} sources  The packs currently selected for inclusion.
   * @returns {CompendiumSourcePackageConfig5e}
   * @protected
   */
  _preparePackageContext(id, pkg, packs, sources) {
    const { title } = pkg;
    const all = packs.isSubsetOf(sources);
    const indeterminate = !all && packs.intersects(sources);
    return {
      id, title, indeterminate,
      checked: indeterminate || all,
      count: packs.size,
      active: this.#selected === id,
      filter: title.replace(/[^\p{L} ]/gu, "").toLocaleLowerCase(game.i18n.lang)
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for pack groups.
   * @param {string} documentType    The pack group's Document type.
   * @param {Set<string>} packs      The packs provided by the selected package.
   * @param {Set<string>} sources    The packs currently selected for inclusion.
   * @returns {CompendiumSourcePackGroup5e}
   * @protected
   */
  _preparePackGroupContext(documentType, packs, sources) {
    packs = packs.filter(id => {
      const pack = game.packs.get(id);
      return pack.documentName === documentType;
    });
    const all = packs.isSubsetOf(sources);
    const indeterminate = !all && packs.intersects(sources);
    return {
      indeterminate,
      checked: indeterminate || all,
      entries: Array.from(packs.map(id => {
        const { collection, title, metadata } = game.packs.get(id);
        const { packageName, flags } = metadata;
        let tag = "";
        // Special case handling for D&D SRD.
        if ( packageName === "dnd5e" ) {
          tag = flags?.dnd5e?.sourceBook?.replace("SRD ", "");
        }
        return {
          tag, title,
          id: collection,
          checked: sources.has(id)
        };
      })).sort((a, b) => {
        return a.tag?.localeCompare(b.tag) || a.title.localeCompare(b.title, game.i18n.lang);
      })
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("keydown", this._debouncedFilter, { passive: true });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if ( partId === "sidebar" ) this._filterPackages();
  }

  /* -------------------------------------------- */

  /**
   * Execute the package list filter.
   * @protected
   */
  _filterPackages() {
    const query = this.#filter.replace(/[^\p{L} ]/gu, "").toLocaleLowerCase(game.i18n.lang);
    this.element.querySelectorAll(".package-list.modules > li").forEach(item => {
      item.toggleAttribute("hidden", query && !item.dataset.filter.includes(query));
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if ( event.target.dataset.type ) this._onToggleSource(event.target);
  }

  /* -------------------------------------------- */

  /**
   * Handle filtering the package sidebar.
   * @param {KeyboardEvent} event  The triggering event.
   * @protected
   */
  _onFilterPackages(event) {
    if ( !event.target.matches("search > input") ) return;
    this.#filter = event.target.value;
    this._filterPackages();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a compendium browser source pack.
   * @param {CheckboxElement} target  The element that was toggled.
   * @returns {Record<string, boolean>}
   * @protected
   */
  _onTogglePack(target) {
    const packs = {};
    const { name, checked, indeterminate } = target;
    if ( (name === "all-items") || (name === "all-actors") ) {
      const [, documentType] = name.split("-");
      const pkg = this.#selected === "world"
        ? game.world
        : this.#selected === "system"
          ? game.system
          : game.modules.get(this.#selected.slice(7));
      for ( const { id, type } of pkg.packs ) {
        if ( game[documentType].documentName === type ) packs[id] = indeterminate ? false : checked;
      }
    }
    else packs[name] = checked;
    return packs;
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a compendium browser source package.
   * @param {CheckboxElement} target  The element that was toggled.
   * @returns {Record<string, boolean>}
   * @protected
   */
  _onTogglePackage(target) {
    const packs = {};
    const { name, checked, indeterminate } = target;
    const pkg = name === "world" ? game.world : name === "system" ? game.system : game.modules.get(name.slice(7));
    for ( const { id } of pkg.packs ) packs[id] = indeterminate ? false : checked;
    return packs;
  }

  /* -------------------------------------------- */

  /**
   * Toggle a compendium browser source.
   * @param {CheckboxElement} target  The element that was toggled.
   * @protected
   */
  async _onToggleSource(target) {
    let packs;
    switch ( target.dataset.type ) {
      case "pack": packs = this._onTogglePack(target); break;
      case "package": packs = this._onTogglePackage(target); break;
      default: return;
    }
    const setting = { ...game.settings.get("dnd5e", "packSourceConfiguration"), ...packs };
    await game.settings.set("dnd5e", "packSourceConfiguration", setting);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle clearing the package filter.
   * @this {CompendiumBrowserSettingsConfig}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The target of the click event.
   */
  static #onClearPackageFilter(event, target) {
    const input = target.closest("search").querySelector(":scope > input");
    input.value = this.#filter = "";
    this._filterPackages();
  }

  /* -------------------------------------------- */

  /**
   * Handle selecting a package.
   * @this {CompendiumBrowserSettingsConfig}
   * @param {PointerEvent} event  The originating click event.
   * @param {HTMLElement} target  The target of the click event.
   */
  static #onSelectPackage(event, target) {
    const { packageId } = target.closest("[data-package-id]")?.dataset ?? {};
    if ( !packageId ) return;
    this.#selected = packageId;
    this.render();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Collate sources for inclusion in the compendium browser.
   * @returns {Set<string>}  The set of packs that should be included in the compendium browser.
   */
  static collateSources() {
    const sources = new Set();
    const setting = game.settings.get("dnd5e", "packSourceConfiguration");
    for ( const { collection, documentName } of game.packs ) {
      if ( (documentName !== "Actor") && (documentName !== "Item") ) continue;
      if ( setting[collection] !== false ) sources.add(collection);
    }
    return sources;
  }
}
