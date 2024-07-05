import * as Filter from "../filter.mjs";

const ApplicationV2 = foundry.applications?.api?.ApplicationV2 ?? (class {});
const HandlebarsApplicationMixin = foundry.applications?.api?.HandlebarsApplicationMixin ?? (cls => cls);

/**
 * @typedef {object} CompendiumBrowserFilters
 * @property {string} [documentClass]  Document type to fetch (e.g. Actor or Item).
 * @property {Set<string>} [types]     Individual document subtypes to filter upon (e.g. "loot", "class", "npc").
 */

/**
 * Application for browsing, filtering, and searching for content between multiple compendiums.
 * @extends ApplicationV2
 * @mixes HandlebarsApplicationMixin
 */
export default class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(...args) {
    if ( game.release.generation < 12 ) throw Error("Compendium Browser only works in Foundry V12 or later");
    super(...args);

    this.#filters = this.options.filters?.initial ?? {};
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "compendium-browser-{id}",
    classes: ["dnd5e2", "compendium-browser"],
    window: {
      title: "DND5E.CompendiumBrowser.Title",
      icon: "fa-solid fa-book-open-reader",
      minimizable: true,
      resizable: true
    },
    actions: {
      openLink: CompendiumBrowser.#onOpenLink,
      setFilter: CompendiumBrowser.#onSetFilter,
      setType: CompendiumBrowser.#onSetType,
      toggleCollapse: CompendiumBrowser.#onToggleCollapse
    },
    position: {
      width: 1024,
      height: 640
    },
    filters: {
      locked: {},
      initial: {
        documentClass: "Item"
      }
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    documentClass: {
      id: "sidebar-class",
      classes: ["sidebar-part"],
      template: "systems/dnd5e/templates/compendium/browser-sidebar-class.hbs"
    },
    types: {
      id: "sidebar-types",
      classes: ["sidebar-part"],
      template: "systems/dnd5e/templates/compendium/browser-sidebar-types.hbs"
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
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Currently define filters.
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
    return filters;
  }

  /* -------------------------------------------- */

  /**
   * Fetched results.
   * @type {Promise<object[]|Document[]>}
   */
  #results;

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    const sidebar = document.createElement("form");
    sidebar.classList.add("sidebar", "flexcol");
    sidebar.replaceChildren(...this.element.querySelectorAll(".sidebar-part"));
    this.element.querySelector(".window-content").insertAdjacentElement("afterbegin", sidebar);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "documentClass":
      case "types": return this._prepareSidebarContext(partId, context, options);
      case "results": return this._prepareResultsContext(context, options);
    }
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
    context.filters = this.currentFilters;
    context.isLocked = {};
    context.isLocked.types = "types" in this.options.filters.locked;
    context.isLocked.documentClass = ("documentClass" in this.options.filters.locked) || context.isLocked.types;

    if ( partId === "types" ) {
      context.types = CONFIG[context.filters.documentClass].documentClass.compendiumBrowserTypes({
        chosen: context.filters.types
      });
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
    const currentFilters = this.currentFilters;
    // TODO: Determine if new set of results need to be fetched, otherwise use old results and re-sort as necessary
    // Sorting changes alone shouldn't require a re-fetch, but any change to filters will
    this.#results = CompendiumBrowser.fetch(
      CONFIG[currentFilters.documentClass].documentClass,
      {
        types: currentFilters.types
      }
    );
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render results once loaded to avoid holding up initial app display.
   * @protected
   */
  async _renderResults() {
    let rendered = [];
    for ( const entry of await this.#results ) {
      const context = { entry };
      rendered.push(
        renderTemplate("systems/dnd5e/templates/compendium/browser-entry.hbs", context)
          .then(html => {
            const template = document.createElement("template");
            template.innerHTML = html;
            const element = template.content.firstElementChild;
            element.dataset.tooltip = `
              <section class="loading" data-uuid="${entry.uuid}">
                <i class="fa-solid fa-spinner fa-spin-pulse" inert></i>
              </section>
            `;
            element.dataset.tooltipClass = "dnd5e2 dnd5e-tooltip item-tooltip";
            element.dataset.tooltipDirection ??= "RIGHT";
            return element;
          })
      );
    }
    this.element.querySelector('[data-application-part="results"] tbody')
      .replaceChildren(...(await Promise.all(rendered)));
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if ( partId === "results" ) this._renderResults();
    else if ( partId === "types" ) this.#adjustCheckboxStates(htmlElement);
  }

  /* -------------------------------------------- */

  /**
   * Adjust the states of group checkboxes to make then indeterminate if only some of their children are selected.
   * @param {HTMLElement} htmlElement  Element within which to find groups.
   */
  #adjustCheckboxStates(htmlElement) {
    for ( const groupArea of htmlElement.querySelectorAll(".type-group") ) {
      const group = groupArea.querySelector('.type-group-header input[type="checkbox"]');
      const children = groupArea.querySelectorAll('.wrapper input[type="checkbox"]');
      if ( Array.from(children).every(e => e.checked) ) {
        group.checked = true;
        group.indeterminate = false;
      } else {
        group.checked = group.indeterminate = Array.from(children).some(e => e.checked);
      }
    }
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
    foundry.utils.setProperty(this.#filters, name, value);

    if ( target.tagName === "BUTTON" ) for ( const button of this.element.querySelectorAll(`[name="${name}"]`) ) {
      button.ariaPressed = button.value === value;
    }

    const parts = ["results"];
    if ( name === "documentClass" ) {
      parts.push("types");
      delete this.#filters.types;
    }
    this.render({ parts });
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
      for ( const child of target.closest(".type-group").querySelectorAll('input[type="checkbox"][value]') ) {
        child.checked = target.checked;
        if ( target.checked ) this.#filters.types.add(child.defaultValue);
        else this.#filters.types.delete(child.defaultValue);
      }
    }

    this.render({ parts: ["results"] });
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

    // Iterate over all packs
    let documents = game.packs

      // Skip packs that have the wrong document class
      .filter(p => (p.metadata.type === documentClass.metadata.name)

      // TODO: Filter packs by visibility & system setting

        // And if types are set and specified in compendium flag, only include those that include the correct types
        && (!types.size || !p.metadata.flags.dnd5e?.types || new Set(p.metadata.flags.dnd5e.types).intersects(types)))

      // Generate an index based on the needed fields
      .map(async p => await Promise.all((await p.getIndex({ fields: Array.from(indexFields) }))

        // Remove any documents that don't match the specified types or the provided filters
        .filter(i => (!types.size || types.has(i.type)) && (!filters.length || Filter.performCheck(i, filters)))

        // If full documents are required, retrieve those, otherwise stick with the indices
        .map(async i => index ? i : await fromUuid(i.uuid))
      ));

    // Wait for everything to finish loading and flatten the arrays
    documents = (await Promise.all(documents)).flat();

    if ( sort ) {
      if ( sort === true ) sort = "name";
      const sortFunc = foundry.utils.getType(sort) === "function" ? sort : (lhs, rhs) => {
        return String(foundry.utils.getProperty(lhs, sort)).localeCompare(String(foundry.utils.getProperty(rhs, sort)));
      };
      documents.sort(sortFunc);
    }

    return documents;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Inject the compendium browser button into the compendium sidebar.
   * @param {HTMLElement} html  HTML of the sidebar being rendered.
   */
  static injectSidebarButton(html) {
    if ( game.release.generation < 12 ) return;
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("open-compendium-browser");
    button.innerHTML = `
      <i class="fa-solid fa-book-open-reader" inert></i>
      ${game.i18n.localize("DND5E.CompendiumBrowser.Action.Open")}
    `;
    button.addEventListener("click", event => (new CompendiumBrowser()).render({ force: true }));

    const headerActions = html.querySelector(".header-actions");
    headerActions.append(button);
  }
}
