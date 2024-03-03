/**
 * Variant of the standard journal sheet to handle custom TOC numbering.
 */
export default class JournalSheet5e extends JournalSheet {
  /** @inheritDoc */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("dnd5e2-journal");
    return options;
  }

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

  /* -------------------------------------------- */

  /** @inheritdoc */
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
}
