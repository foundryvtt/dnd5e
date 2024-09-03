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
    static _stylesheets = new WeakMap();

    /**
     * The CSS content for this element.
     * @type {string}
     */
    static CSS = "";

    /* -------------------------------------------- */

    /** @inheritDoc */
    adoptedCallback() {
      const sheet = this._getStyleSheet();
      if ( sheet ) this._adoptStyleSheet(this._getStyleSheet());
    }

    /* -------------------------------------------- */

    /**
     * Retrieves the cached stylesheet, or generates a new one.
     * @returns {CSSStyleSheet}
     * @protected
     */
    _getStyleSheet() {
      let sheet = this.constructor._stylesheets.get(this.ownerDocument);
      if ( !sheet && this.ownerDocument.defaultView ) {
        sheet = new this.ownerDocument.defaultView.CSSStyleSheet();
        sheet.replaceSync(this.constructor.CSS);
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
  };
}
