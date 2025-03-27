import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";

/**
 * A custom HTML element that displays proficiency status and allows cycling through values.
 * @fires change
 */
export default class ProficiencyCycleElement extends AdoptedStyleSheetMixin(
  foundry.applications.elements.AbstractFormInputElement
) {
  /** @inheritDoc */
  constructor() {
    super();
    this._internals.role = "spinbutton";
    this.#shadowRoot = this.attachShadow({ mode: "open" });
    this._adoptStyleSheet(this._getStyleSheet());
    this._value = Number(this.getAttribute("value") ?? 0);
  }

  /** @inheritDoc */
  static CSS = `
    :host { display: inline-block; }
    div { --_fill: var(--proficiency-cycle-enabled-color, var(--dnd5e-color-blue)); }
    div:has(:disabled, :focus-visible) { --_fill: var(--proficiency-cycle-disabled-color, var(--dnd5e-color-gold)); }
    div:not(:has(:disabled)) { cursor: var(--cursor-pointer); }

    div {
      position: relative;
      overflow: clip;
      width: 100%;
      aspect-ratio: 1;

      &::before {
        content: "";
        position: absolute;
        display: block;
        inset: 3px;
        border: 1px solid var(--_fill);
        border-radius: 100%;
      }

      &:has([value="1"])::before { background: var(--_fill); }

      &:has([value="0.5"], [value="2"])::after {
        content: "";
        position: absolute;
        background: var(--_fill);
      }

      &:has([value="0.5"])::after {
        inset: 4px;
        width: 4px;
        aspect-ratio: 1 / 2;
        border-radius: 100% 0 0 100%;
      }

      &:has([value="2"]) {
        &::before {
          inset: 1px;
          border-width: 2px;
        }

        &::after {
          inset: 5px;
          border-radius: 100%;
        }
      }
    }

    input {
      position: absolute;
      inset-block-start: -100px;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
  `;

  /**
   * Controller for removing listeners automatically.
   * @type {AbortController}
   */
  #controller;

  /**
   * Shadow root of the element.
   * @type {ShadowRoot}
   */
  #shadowRoot;

  /* -------------------------------------------- */

  /** @override */
  _toggleDisabled(value) {
    this.#shadowRoot.querySelector("input")?.toggleAttribute("disabled", value);
  }

  /* -------------------------------------------- */

  /**
   * Type of proficiency represented by this control (e.g. "ability" or "skill").
   * @type {"ability"|"skill"|"tool"}
   */
  get type() { return this.getAttribute("type") ?? "ability"; }

  set type(value) {
    if ( !["ability", "skill", "tool"].includes(value) ) throw new Error("Type must be 'ability', 'skill', or 'tool'.");
    this.setAttribute("type", value);
    this._internals.ariaValueMin = 0;
    this._internals.ariaValueMax = value === "ability" ? 1 : 2;
    this._internals.ariaValueStep = value === "ability" ? 1 : 0.5;
  }

  /* -------------------------------------------- */

  /**
   * Valid values for the current type.
   * @type {number[]}
   */
  get validValues() {
    return this.type === "ability" ? [0, 1] : [0, 1, .5, 2];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _setValue(value) {
    if ( !this.validValues.includes(value) ) throw new Error("Value must be a valid proficiency multiplier.");
    return super._setValue(value);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _adoptStyleSheet(sheet) {
    this.#shadowRoot.adoptedStyleSheets = [sheet];
  }

  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    const div = document.createElement("div");
    this.#shadowRoot.replaceChildren(div);

    const input = document.createElement("input");
    input.setAttribute("type", "number");
    if ( this.disabled ) input.setAttribute("disabled", "");
    div.appendChild(input);

    return [];
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    const input = this.#shadowRoot.querySelector("input");
    input.setAttribute("value", this._value);
    this._internals.ariaValueNow = this._value;
    this._internals.ariaValueText = CONFIG.DND5E.proficiencyLevels[this._value];
    this._internals.setFormValue(this._value);
    this._primaryInput = this.#shadowRoot.querySelector("input");
  }

  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    const { signal } = this.#controller = new AbortController();
    this.addEventListener("click", this.#onClick.bind(this), { signal });
    this.addEventListener("contextmenu", this.#onClick.bind(this), { signal });
    this.#shadowRoot.querySelector("div").addEventListener("contextmenu", e => e.preventDefault(), { signal });
    this.#shadowRoot.querySelector("input").addEventListener("change", this.#onChangeInput.bind(this), { signal });
  }

  /* -------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    this.#controller.abort();
  }

  /* -------------------------------------------- */

  /**
   * Redirect focus requests into the inner input.
   * @param {object} options  Focus options forwarded to inner input.
   */
  focus(options) {
    this.#shadowRoot.querySelector("input")?.focus(options);
  }

  /* -------------------------------------------- */

  /**
   * Change the value by one step, looping around if the limits have been reached.
   * @param {boolean} [up=true]  Should the value step up or down?
   */
  step(up=true) {
    const levels = this.validValues;
    const idx = levels.indexOf(this.value);
    this.value = levels[(idx + (up ? 1 : levels.length - 1)) % levels.length];
    this.dispatchEvent(new Event("change"));
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to the input value directly.
   * @param {Event} event  Triggering change event.
   */
  #onChangeInput(event) {
    this.step(event.target.valueAsNumber > this.value);
  }

  /* -------------------------------------------- */

  /**
   * Handle a click event for modifying the value.
   * @param {PointerEvent} event  Triggering click event.
   */
  #onClick(event) {
    event.preventDefault();
    if ( this.disabled ) return;
    this.step((event.type === "click") && (event.button !== 2));
  }
}
