/**
 * Custom element for displaying SVG icons that are cached and can be styled.
 */
export default class IconElement extends HTMLElement {
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "img";
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
  }

  /**
   * The custom element's form and accessibility internals.
   * @type {ElementInternals}
   */
  #internals;

  /**
   * Shadow root that contains the icon.
   * @type {ShadowRoot}
   */
  #shadowRoot;

  /* -------------------------------------------- */

  /**
   * Path to the SVG source file.
   * @type {string}
   */
  get src() {
    return this.getAttribute("src");
  }

  set src(src) {
    this.setAttribute("src", src);
  }

  /* -------------------------------------------- */

  /**
   * The stylesheets map to store the CSS singleton
   * associated with a particular shadowroot.
   * @type {WeakMap<Document, CSSStyleSheet>}
   */
  static #stylesheets;

  /* -------------------------------------------- */

  /**
   * Cached SVG files by SRC.
   * @type {Map<string, SVGElement|Promise<SVGElement>>}
   */
  static #svgCache = new Map();


  /* -------------------------------------------- */

  #buildCSS() {
    if (!this.constructor.#stylesheets) {
      this.constructor.#stylesheets = new WeakMap();
    }

    const _window = this.ownerDocument.defaultView;
    let cssObj = this.constructor.#stylesheets.get(_window.document);

    if (!cssObj) {
      cssObj = new _window.CSSStyleSheet();
      cssObj.replaceSync(`
        :host {
          display: contents;
        }
        svg {
          fill: var(--icon-fill, #000);
          width: var(--icon-width, var(--icon-size, 1em));
          height: var(--icon-height, var(--icon-size, 1em));
        }
      `);
      this.constructor.#stylesheets.set(_window.document, cssObj);
    }
    this.#shadowRoot.adoptedStyleSheets = [this.constructor.#stylesheets.get(_window.document)];
  }

  /* -------------------------------------------- */

  /** @override */
  adoptedCallback() {
    this.#buildCSS();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  connectedCallback() {
    this.#buildCSS();
    const insertElement = element => {
      if ( !element ) return;
      const clone = element.cloneNode(true);
      this.#shadowRoot.replaceChildren(clone);
    };

    // Insert element immediately if already available, otherwise wait for fetch
    const element = this.constructor.fetch(this.src);
    if ( element instanceof Promise ) element.then(insertElement);
    else insertElement(element);
  }

  /* -------------------------------------------- */

  /**
   * Fetch an SVG element from a source.
   * @param {string} src                        Path of the SVG file to retrieve.
   * @returns {SVGElement|Promise<SVGElement>}  Promise if the element is not cached, otherwise the element directly.
   */
  static fetch(src) {
    if ( !this.#svgCache.has(src) ) this.#svgCache.set(src, fetch(src)
      .then(b => b.text())
      .then(t => {
        const temp = document.createElement("div");
        temp.innerHTML = t;
        const svg = temp.querySelector("svg");
        this.#svgCache.set(src, svg);
        return svg;
      }));
    return this.#svgCache.get(src);
  }
}
