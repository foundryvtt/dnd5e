/**
 * Custom element for displaying SVG icons that are cached and can be styled.
 */
export default class IconElement extends HTMLElement {
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "img";
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this.#src = this.getAttribute("src");
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
  #src;

  /* -------------------------------------------- */

  /**
   * Stylesheet that is shared among all icons.
   * @type {CSSStyleSheet}
   */
  static #stylesheet;

  /* -------------------------------------------- */

  /**
   * Cached SVG files by SRC.
   * @type {Map<string, SVGElement|Promise<SVGElement>>}
   */
  static #svgCache = new Map();

  /* -------------------------------------------- */

  /** @inheritDoc */
  connectedCallback() {
    this.replaceChildren();

    // Create icon styles
    if ( !this.constructor.#stylesheet ) {
      this.constructor.#stylesheet = new CSSStyleSheet();
      this.constructor.#stylesheet.replaceSync(`
        :host {
          display: contents;
        }
        svg {
          fill: var(--icon-fill, #000);
          width: var(--icon-width, var(--icon-size, 1em));
          height: var(--icon-height, var(--icon-size, 1em));
        }
      `);
    }
    this.#shadowRoot.adoptedStyleSheets = [this.constructor.#stylesheet];

    const insertElement = element => {
      if ( !element ) return;
      const clone = element.cloneNode(true);
      this.#shadowRoot.appendChild(clone);
    };

    // Insert element immediately if already available, otherwise wait for fetch
    const element = this.constructor.fetch(this.#src);
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
