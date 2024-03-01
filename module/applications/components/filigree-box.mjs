import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";

/**
 * Custom element that adds a filigree border that can be colored.
 */
export default class FiligreeBoxElement extends AdoptedStyleSheetMixin(HTMLElement) {
  constructor() {
    super();
    this.#shadowRoot = this.attachShadow({ mode: "closed" });
    this._adoptStyleSheet(this._getStyleSheet());
    const backdrop = document.createElement("div");
    backdrop.classList.add("backdrop");
    this.#shadowRoot.appendChild(backdrop);
    this.#buildSVG("corner", "top", "left");
    this.#buildSVG("corner", "top", "right");
    this.#buildSVG("corner", "bottom", "left");
    this.#buildSVG("corner", "bottom", "right");
    this.#buildSVG("block", "top");
    this.#buildSVG("block", "bottom");
    this.#buildSVG("inline", "left");
    this.#buildSVG("inline", "right");
    const slot = document.createElement("slot");
    this.#shadowRoot.appendChild(slot);
  }

  /** @inheritDoc */
  static CSS = `
    :host {
      position: relative;
      isolation: isolate;
      min-height: 56px;
      filter: var(--filigree-drop-shadow, drop-shadow(0 0 12px var(--dnd5e-shadow-15)));
    }
    .backdrop {
      --chamfer: 12px;
      position: absolute;
      inset: 0;
      background: var(--filigree-background-color, var(--dnd5e-color-card));
      z-index: -2;
      clip-path: polygon(
        var(--chamfer) 0,
        calc(100% - var(--chamfer)) 0,
        100% var(--chamfer),
        100% calc(100% - var(--chamfer)),
        calc(100% - var(--chamfer)) 100%,
        var(--chamfer) 100%,
        0 calc(100% - var(--chamfer)),
        0 var(--chamfer)
      );
    }
    .filigree {
      position: absolute;
      fill: var(--filigree-border-color, var(--dnd5e-color-gold));
      z-index: -1;

      &.top, &.bottom { height: 30px; }
      &.top { top: 0; }
      &.bottom { bottom: 0; scale: 1 -1; }

      &.left, &.right { width: 25px; }
      &.left { left: 0; }
      &.right { right: 0; scale: -1 1; }

      &.bottom.right { scale: -1 -1; }
    }
    .filigree.block {
      inline-size: calc(100% - 50px);
      inset-inline: 25px;
    }
    .filigree.inline {
      block-size: calc(100% - 60px);
      inset-block: 30px;
    }
  `;

  /**
   * Path definitions for the various box corners and edges.
   * @type {object}
   */
  static svgPaths = Object.freeze({
    corner: "M 3 21.7 C 5.383 14.227 9.646 7.066 18.1 3.2 L 12.2 3.2 L 3 12.8 Z M 6.9 15.7 C 5.088 19.235 3.776 23.004 3 26.9 L 2.999 30 L 0 30 L 0 11.5 L 11 0 L 25 0 L 25 3.1 L 22.4 3.1 C 16.737 4.586 11.822 8.112 8.6 13 L 8.6 30 L 6.9 30 Z",
    block: "M 0 0 L 10 0 L 10 3.1 L 0 3.1 L 0 0 Z",
    inline: "M 0 10 L 0 0 L 2.99 0 L 2.989 10 L 0 10 Z M 6.9 10 L 6.9 0 L 8.6 0 L 8.6 10 L 6.9 10 Z"
  });

  /**
   * Shadow root that contains the box shapes.
   * @type {ShadowRoot}
   */
  #shadowRoot;

  /* -------------------------------------------- */

  /** @inheritDoc */
  _adoptStyleSheet(sheet) {
    this.#shadowRoot.adoptedStyleSheets = [sheet];
  }

  /* -------------------------------------------- */

  /**
   * Build an SVG element.
   * @param {string} path          SVG path to use.
   * @param {...string} positions  Additional position CSS classes to add.
   */
  #buildSVG(path, ...positions) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("filigree", path, ...positions);
    svg.innerHTML = `<path d="${FiligreeBoxElement.svgPaths[path]}" />`;
    svg.setAttribute("viewBox", `0 0 ${path === "block" ? 10 : 25} ${path === "inline" ? 10 : 30}`);
    svg.setAttribute("preserveAspectRatio", "none");
    this.#shadowRoot.appendChild(svg);
  }
}
