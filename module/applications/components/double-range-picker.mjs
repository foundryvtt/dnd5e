/**
 * Version of the default range picker that has number inputs on both sides.
 */
export default class DoubleRangePickerElement extends foundry.applications.elements.HTMLRangePickerElement {
  constructor() {
    super();
    this.#min = Number(this.getAttribute("min")) ?? 0;
    this.#max = Number(this.getAttribute("max")) ?? 1;
  }

  /** @override */
  static tagName = "double-range-picker";

  /**
   * The range input.
   * @type {HTMLInputElement}
   */
  #rangeInput;

  /**
   * The left number input.
   * @type {HTMLInputElement}
   */
  #leftInput;

  /**
   * The right number input.
   * @type {HTMLInputElement}
   */
  #rightInput;

  /**
   * The minimum allowed value for the range.
   * @type {number}
   */
  #min;

  /**
   * The maximum allowed value for the range.
   * @type {number}
   */
  #max;

  /* -------------------------------------------- */

  /** @inheritDoc */
  _buildElements() {
    const [range, right] = super._buildElements();
    this.#rangeInput = range;
    this.#rightInput = right;
    this.#leftInput = this.#rightInput.cloneNode();
    return [this.#leftInput, this.#rangeInput, this.#rightInput];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _refresh() {
    super._refresh();
    if ( !this.#rangeInput ) return;
    this.#leftInput.valueAsNumber = this.#max - this.#rightInput.valueAsNumber + this.#min;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _activateListeners() {
    super._activateListeners();
    this.#rangeInput.addEventListener("input", this.#onDragSlider.bind(this));
    this.#leftInput.addEventListener("change", this.#onChangeInput.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Update display of the number input as the range slider is actively changed.
   * @param {InputEvent} event     The originating input event
   */
  #onDragSlider(event) {
    event.preventDefault();
    this.#leftInput.valueAsNumber = this.#max - this.#rangeInput.valueAsNumber + this.#min;
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to the left input.
   * @param {InputEvent} event     The originating input change event
   */
  #onChangeInput(event) {
    event.stopPropagation();
    this.value = this.#max - event.currentTarget.valueAsNumber + this.#min;
  }

  /* -------------------------------------------- */

  /** @override */
  _toggleDisabled(disabled) {
    super._toggleDisabled(disabled);
    this.#leftInput.toggleAttribute("disabled", disabled);
  }
}
