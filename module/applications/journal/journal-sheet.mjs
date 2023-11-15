/**
 * Variant of the standard journal sheet to handle custom TOC numbering.
 */
export default class JournalSheet5e extends JournalSheet {
  /** @inheritdoc */
  _getPageData() {
    const pageData = super._getPageData();

    let adjustment = 0;
    for ( const page of pageData ) {
      const pageDocument = this.document.pages.get(page._id);
      let needsAdjustment = true;
      if ( foundry.utils.getType(pageDocument?.system?.adjustTOCNumbering) === "function" ) {
        const numbering = pageDocument.system.adjustTOCNumbering(page.number);
        if ( numbering ) {
          page.number = numbering.number;
          adjustment += numbering.adjustment ?? 0;
          needsAdjustment = false;
        }
      }
      if ( needsAdjustment ) page.number += adjustment;
    }

    return pageData;
  }
}
