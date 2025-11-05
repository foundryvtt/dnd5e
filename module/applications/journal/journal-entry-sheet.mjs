/**
 * Variant of the standard journal sheet with support for additional page types.
 */
export default class JournalEntrySheet5e extends foundry.applications.sheets.journal.JournalEntrySheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["dnd5e2", "dnd5e2-journal", "titlebar"]
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _createContextMenu(handler, selector, options={}) {
    options.fixed = true;
    return super._createContextMenu(handler, selector, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll(".action-buttons :is(.previous, .next)").forEach(el => {
      el.classList.add("inline-control");
    });
    if ( options.parts.includes("pages") ) this.constructor._injectNavigation(this.document, this.element);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _preparePageData() {
    const pages = super._preparePageData();
    this.constructor._adjustTOCNumbering(this.document, pages);
    return pages;
  }

  /* -------------------------------------------- */

  /**
   * Append the dnd5e system styling classes to journal pages inside system journal sheets.
   * @param {JournalEntryPageSheet} page  The page application.
   * @param {HTMLElement} element         The page application's rendered element.
   */
  static onRenderJournalPageSheet(page, element) {
    if ( page.document.parent?.sheet instanceof JournalEntrySheet5e ) {
      element.classList.add("dnd5e2", "dnd5e2-journal", "titlebar", "dialog-lg");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("pointerdown", event => {
      const tooltipActive = event.target.ownerDocument.getElementById("tooltip")?.classList.contains("active");
      if ( (event.button === 1) && tooltipActive ) event.preventDefault();
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Adjust ToC numbering for custom page types.
   * @param {JournalEntry} entry                             The parent JournalEntry.
   * @param {Record<string, JournalSheetPageContext>} pages  The page descriptors.
   * @internal
   */
  static _adjustTOCNumbering(entry, pages) {
    let adjustment = 0;
    for ( const descriptor of Object.values(pages) ) {
      const page = entry.pages.get(descriptor.id);
      const numbering = page?.system.adjustTOCNumbering?.(descriptor.number);
      if ( numbering ) {
        descriptor.number = numbering.number;
        adjustment += numbering.adjustment ?? 0;
      }
      else descriptor.number += adjustment;
    }
  }

  /* -------------------------------------------- */

  /**
   * Add navigation controls for journal entries that define them.
   * @param {JournalEntry} entry  The parent JournalEntry.
   * @param {HTMLElement} html    The
   * @internal
   */
  static async _injectNavigation(entry, html) {
    const nav = entry.getFlag("dnd5e", "navigation");
    if ( !nav ) return;
    const getDocument = id => entry.pack ? entry.collection.getDocument(id) : entry.collection.get(id);
    const previous = nav.previous ? await getDocument(nav.previous) : null;
    const up = nav.up ? await getDocument(nav.up) : null;
    const next = nav.next ? await getDocument(nav.next) : null;
    const element = document.createElement("nav");
    element.classList.add("book-navigation");
    const list = document.createElement("ul");
    element.append(list);
    list.append(JournalEntrySheet5e.#makeNavigation(previous, "prev"));
    list.append(JournalEntrySheet5e.#makeNavigation(up, "up"));
    list.append(JournalEntrySheet5e.#makeNavigation(next, "next"));
    html.querySelector(".journal-entry-content .journal-header")?.after(element);
  }

  /* -------------------------------------------- */

  /**
   * Generate markup for a navigation link.
   * @param {JournalEntry} doc        The journal entry that will be navigated to.
   * @param {"next"|"prev"|"up"} dir  The navigation direction.
   * @returns {HTMLLIElement}
   */
  static #makeNavigation(doc, dir) {
    const li = document.createElement("li");
    if ( !doc?.testUserPermission(game.user, "OBSERVER") ) return li;
    const anchor = document.createElement("a");
    anchor.classList.add("content-link");
    if ( dir === "up" ) anchor.classList.add("parent");
    else {
      anchor.rel = dir;
      anchor.dataset.tooltipDirection = dir === "prev" ? "LEFT" : "RIGHT";
    }
    const i18n = { prev: "Previous", next: "Next", up: "Up" };
    Object.assign(anchor.dataset, { link: "", tooltip: `DND5E.JOURNALENTRY.Navigation.${i18n[dir]}`, uuid: doc.uuid });
    anchor.append(doc.name);
    li.append(anchor);
    return li;
  }
}
