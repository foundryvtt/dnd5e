/**
 * Variant of the standard journal sheet to handle custom TOC numbering.
 */
export default class JournalSheet5e extends (foundry.appv1?.sheets?.JournalSheet ?? JournalSheet) {
  /** @inheritDoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("dnd5e2-journal");
    return options;
  }

  /* --------------------------------------------- */
  /*  Rendering                                    */
  /* --------------------------------------------- */

  /** @inheritDoc */
  _getPageData() {
    const pageData = super._getPageData();

    let adjustment = 0;
    for ( const page of pageData ) {
      const pageDocument = this.document.pages.get(page._id);
      let needsAdjustment = true;
      const numbering = pageDocument.system.adjustTOCNumbering?.(page.number);
      if ( numbering ) {
        page.number = numbering.number;
        adjustment += numbering.adjustment ?? 0;
        needsAdjustment = false;
      }
      if ( needsAdjustment ) page.number += adjustment;
    }

    return pageData;
  }

  /* --------------------------------------------- */

  /** @inheritdoc */
  async _render(...args) {
    await super._render(...args);
    const [html] = this.element;
    const header = html.querySelector(".journal-entry-content .journal-header");

    // Insert navigation
    const nav = this.document.getFlag("dnd5e", "navigation");
    if ( nav ) {
      const getDocument = id => {
        if ( !this.document.pack ) return game.journal.get(id);
        return game.packs.get(this.document.pack).getDocument(id);
      };
      const previous = nav.previous ? await getDocument(nav.previous) : null;
      const up = nav.up ? await getDocument(nav.up) : null;
      const next = nav.next ? await getDocument(nav.next) : null;
      const element = document.createElement("nav");
      element.classList.add("book-navigation");
      element.innerHTML = `
        <ul>
          <li>${previous ? `<a class="content-link" data-uuid="${previous.uuid}" rel="prev" data-link
            data-tooltip="DND5E.JOURNALENTRY.Navigation.Previous" data-tooltip-direction="LEFT"></a>` : ""}</li>
          <li>${up ? `<a class="content-link parent" data-uuid="${up.uuid}" data-link
            data-tooltip="DND5E.JOURNALENTRY.Navigation.Up"></a>` : ""}</li>
          <li>${next ? `<a class="content-link" data-uuid="${next.uuid}" rel="next" data-link
            data-tooltip="DND5E.JOURNALENTRY.Navigation.Next" data-tooltip-direction="RIGHT"></a>` : ""}</li>
        </ul>
      `;
      if ( previous ) element.querySelector("[rel=prev]").innerText = previous.name;
      if ( up ) element.querySelector(".parent").innerText = up.name;
      if ( next ) element.querySelector("[rel=next]").innerText = next.name;
      header.after(element);
    }
  }

  /* -------------------------------------------- */

  /**
   * Add class to journal pages also.
   * @param {JournalPageSheet} page  The journal page application.
   * @param {jQuery} jQuery          The rendered Application HTML.
   * @param {object} context         Rendering context provided.
   */
  static onRenderJournalPageSheet(page, jQuery, context) {
    if ( page.object.parent.sheet instanceof JournalSheet5e ) {
      let element;
      if ( context.editable ) element = jQuery[0];
      else element = jQuery[0].parentElement;
      element?.classList.add("dnd5e2-journal");
    }
  }

  /* -------------------------------------------- */

  /**
   * Add class to journal ProseMirror editor.
   * @param {JournalEntryPageProseMirrorSheet} page  The journal page application.
   * @param {HTMLElement} element                    The rendered Application HTML.
   * @param {object} context                         Rendering context provided.
   * @param {object} options                         Rendering options provided.
   */
  static onRenderJournalEntryPageProseMirrorSheet(page, element, context, options) {
    if ( page.document.parent.sheet instanceof JournalSheet5e ) {
      element.classList.add("dnd5e2-journal", "themed", "theme-light");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("pointerdown", event => {
      if ( (event.button === 1) && document.getElementById("tooltip")?.classList.contains("active") ) {
        event.preventDefault();
      }
    });
  }
}
