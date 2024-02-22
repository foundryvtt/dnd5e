/**
 * Adds functionality to a custom HTML element for caching its stylesheet and adopting it into its Shadow DOM, rather
 * than having each stylesheet duplicated per element.
 * @param {typeof HTMLElement} Base  The base class being mixed.
 * @returns {typeof AdoptedStyleSheetElement}
 */
export default function AdoptedStyleSheetMixin(Base) {
  return class AdoptedStyleSheetElement extends Base {
    /**
     * A map of cached stylesheets per Document root.
     * @type {WeakMap<WeakKey<Document>, CSSStyleSheet>}
     * @protected
     */
    static _stylesheets;

    /* -------------------------------------------- */

    /** @inheritDoc */
    adoptedCallback() {
      this._adoptStyleSheet(this._getStyleSheet());
    }

    /* -------------------------------------------- */

    /**
     * Retrieves the cached stylesheet, or generates a new one.
     * @protected
     */
    _getStyleSheet() {
      this.constructor._stylesheets ??= new WeakMap();
      let sheet = this.constructor._stylesheets.get(this.ownerDocument);
      if ( !sheet ) {
        sheet = new this.ownerDocument.defaultView.CSSStyleSheet();
        this._buildCSS(sheet);
        this.constructor._stylesheets.set(this.ownerDocument, sheet);
      }
      return sheet;
    }

    /* -------------------------------------------- */

    /**
     * Adopt the stylesheet into the Shadow DOM.
     * @param {CSSStyleSheet} sheet  The sheet to adopt.
     * @abstract
     */
    _adoptStyleSheet(sheet) {}

    /* -------------------------------------------- */

    /**
     * Build the element's custom CSS.
     * @param {CSSStyleSheet} sheet  The stylesheet instance to append the CSS to.
     * @abstract
     */
    _buildCSS(sheet) {}
  }
}
