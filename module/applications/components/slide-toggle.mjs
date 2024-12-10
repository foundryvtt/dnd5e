import CheckboxElement from "./checkbox.mjs";

/**
 * A custom HTML element that represents a checkbox-like input that is displayed as a slide toggle.
 * @fires change
 */
export default class SlideToggleElement extends CheckboxElement {
  /** @inheritDoc */
  constructor() {
    super();
    this._internals.role = "switch";
  }

  /* -------------------------------------------- */

  /** @override */
  static tagName = "slide-toggle";

  /* -------------------------------------------- */

  /** @override */
  static useShadowRoot = false;

  /* -------------------------------------------- */
  /*  Element Lifecycle                           */
  /* -------------------------------------------- */

  /**
   * Activate the element when it is attached to the DOM.
   * @inheritDoc
   */
  connectedCallback() {
    this.replaceChildren(...this._buildElements());
    this._refresh();
    this._activateListeners();
  }

  /* -------------------------------------------- */

  /**
   * Create the constituent components of this element.
   * @returns {HTMLElement[]}
   * @protected
   */
  _buildElements() {
    const track = document.createElement("div");
    track.classList.add("slide-toggle-track");
    const thumb = document.createElement("div");
    thumb.classList.add("slide-toggle-thumb");
    track.append(thumb);
    return [track];
  }
}
