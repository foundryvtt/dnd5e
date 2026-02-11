import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";

const MaybeAdoptable = foundry.applications.elements.AdoptableHTMLElement ?? HTMLElement;

/**
 * Custom element for displaying SVG icons that are cached and can be styled.
 */
export default class IconElement extends AdoptedStyleSheetMixin(MaybeAdoptable) {
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "img";
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
  }

  /* -------------------------------------------- */

  /**
   * The HTML tag named used by this element.
   * @type {string}
   */
  static tagName = "dnd5e-icon";

  /* -------------------------------------------- */

  /** @inheritDoc */
  static CSS = `
    :host {
      display: contents;
    }
    svg {
      fill: var(--icon-fill, #000);
      width: var(--icon-width, var(--icon-size, 1em));
      height: var(--icon-height, var(--icon-size, 1em));
    }
  `;

  /* -------------------------------------------- */

  /** @override */
  static observedAttributes = ["src"];

  /* -------------------------------------------- */

  /**
   * Cached SVG files by SRC.
   * @type {Map<string, SVGElement|Promise<SVGElement>>}
   */
  static #svgCache = new Map();

  /* -------------------------------------------- */

  /**
   * The custom element's form and accessibility internals.
   * @type {ElementInternals}
   */
  #internals;

  /* -------------------------------------------- */

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

  /** @inheritDoc */
  _adoptStyleSheet(sheet) {
    this.#shadowRoot.adoptedStyleSheets = [sheet];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  connectedCallback() {
    this._adoptStyleSheet(this._getStyleSheet());
    this.#setSVG(this.src);
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
        if ( svg ) this.#cleanSVG(svg);
        this.#svgCache.set(src, svg);
        return svg;
      }));
    return this.#svgCache.get(src);
  }

  /* -------------------------------------------- */

  /**
   * Clean non-image content from the SVG.
   * @param {SVGElement} svg  The SVG.
   */
  static #cleanSVG(svg) {
    svg.querySelectorAll("script, foreignObject").forEach(el => el.remove());
    svg.querySelectorAll("*").forEach(el => Array.from(el.attributes).forEach(attr => {
      if ( attr.name.startsWith("on") ) el.removeAttribute(attr.name);
      // eslint-disable-next-line no-script-url
      if ( attr.value && attr.value.trim().toLowerCase().startsWith("javascript:") ) el.removeAttribute(attr.name);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Set the internal contents to an SVG image at the provided path.
   * @param {string} src  Path to the SVG image to display.
   */
  #setSVG(src) {
    const insertElement = element => {
      if ( !element ) return;
      const clone = element.cloneNode(true);
      this.#shadowRoot.replaceChildren(clone);
    };

    // Insert element immediately if already available, otherwise wait for fetch
    const element = this.constructor.fetch(src);
    if ( element instanceof Promise ) element.then(insertElement);
    else insertElement(element);

    // Add input if `data-edit` is set
    let input = this.querySelector("input");
    if ( this.dataset.edit ) {
      if ( !input ) {
        input = document.createElement("input");
        Object.assign(input, { name: this.dataset.edit, type: "hidden" });
        this.append(input);
      }
      input.value = src;
    } else if ( input ) input.remove();
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritDoc */
  attributeChangedCallback(name, oldValue, newValue) {
    if ( name === "src" ) this.#setSVG(newValue);
  }
}
