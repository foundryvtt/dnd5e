/**
 * Input element that represents a three-state filter (include, exclude, or ignore). This is used for filters in
 * the compendium browser and in the inventory element. Returns a number with `1` indicating this filter should be
 * positively applied (show items that match the filter), `-1` indicating it should be negatively applied (hide
 * items that match the filter), and `0` indicating this filter should be ignored.
 */
export default class FilterStateElement extends foundry.applications.elements.AbstractFormInputElement {
  constructor(...args) {
    super(...args);
    this._value = this.getAttribute("value") ?? 0;
  }

  /* -------------------------------------------- */

  /** @override */
  static tagName = "filter-state";

  /* -------------------------------------------- */

  /**
   * Controller for removing listeners automatically.
   * @type {AbortController}
   */
  _controller;

  /* -------------------------------------------- */

  /**
   * Internal indicator used to render the input.
   * @type {HTMLElement}
   */
  #indicator;

  /* -------------------------------------------- */
  /*  Element Properties                          */
  /* -------------------------------------------- */

  /** @override */
  _getValue() {
    return Number(this._value);
  }

  /* -------------------------------------------- */
  /*  Element Lifecycle                           */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    this._controller = new AbortController();
    const elements = this._buildElements();
    this.replaceChildren(...elements);
    this._refresh();
    this._toggleDisabled(!this.editable);
    this._activateListeners();
    if ( !this.hasAttribute("tabindex") ) this.tabIndex = 0;
  }

  /* -------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    this._controller.abort();
  }

  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    this.#indicator = document.createElement("div");
    this.#indicator.classList.add("indicator");
    return [this.#indicator];
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    this.#indicator.dataset.value = this.value ?? 0;
  }

  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    const { signal } = this._controller;
    this.addEventListener("click", this._onClick.bind(this), { signal });
    this.addEventListener("contextmenu", this._onClick.bind(this), { signal });
    this.addEventListener("keydown", event => event.key === " " ? this.#handleValueChange() : null, { signal });
  }

  /* -------------------------------------------- */

  /** @override */
  _onClick(event) {
    this.#handleValueChange(event.button === 2);
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the value based on a click or keyboard trigger.
   * @param {boolean} [backwards=false]  Should the value be decreased rather than increased?
   */
  #handleValueChange(backwards=false) {
    if ( this.disabled ) return;
    let newValue = (this.value ?? 0) + (backwards ? -1 : 1);
    if ( newValue > 1 ) newValue = -1;
    else if ( newValue < -1 ) newValue = 1;
    this.value = newValue;
  }
}
