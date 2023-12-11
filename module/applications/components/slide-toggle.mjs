/**
 * A custom HTML element that represents a checkbox-like input that is displayed as a slide toggle.
 * @fires change
 */
export default class SlideToggleElement extends HTMLElement {
  /** @override */
  static formAssociated = true;

  /** @inheritDoc */
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = "switch";
  }

  /**
   * The custom element's form and accessibility internals.
   * @type {ElementInternals}
   */
  #internals;

  /**
   * The form this element belongs to, if any.
   * @type {HTMLFormElement}
   */
  get form() {
    return this.#internals.form;
  }

  /* -------------------------------------------- */

  /**
   * The name of the toggle.
   * @type {string}
   */
  get name() {
    return this.getAttribute("name");
  }

  set name(value) {
    this.setAttribute("name", value);
  }

  /* -------------------------------------------- */

  /**
   * Whether the slide toggle is toggled on.
   * @type {boolean}
   */
  get checked() {
    return this.hasAttribute("checked");
  }

  set checked(value) {
    if ( typeof value !== "boolean" ) throw new Error("Slide toggle checked state must be a boolean.");
    if ( value ) this.setAttribute("checked", "");
    else this.removeAttribute("checked");
  }

  /* -------------------------------------------- */

  /**
   * The value of the input as it appears in form data.
   * @type {string}
   */
  get value() {
    return this.getAttribute("value") || "on";
  }

  set value(value) {
    this.setAttribute("value", value);
  }

  /* -------------------------------------------- */

  /**
   * Masquerade as a checkbox input.
   * @type {string}
   */
  get type() {
    return "checkbox";
  }

  /* -------------------------------------------- */

  /**
   * Activate the element when it is attached to the DOM.
   * @inheritDoc
   */
  connectedCallback() {
    this.replaceChildren();
    this.append(...this._buildElements());
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

  /* -------------------------------------------- */

  /**
   * Activate event listeners.
   * @protected
   */
  _activateListeners() {
    this.addEventListener("click", this._onToggle.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the control.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onToggle(event) {
    event.preventDefault();
    this.checked = !this.checked;
    this.dispatchEvent(new Event("change"));
  }
}
