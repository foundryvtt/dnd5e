/**
 * A custom HTML element that displays proficiency status and allows cycling through values.
 * @fires change
 */
export default class ProficiencyCycleElement extends HTMLElement {
  /** @inheritDoc */
  constructor() {
    super();
    this.#controller = new AbortController();
    this.#internals = this.attachInternals();
    this.#internals.role = "spinbutton";
    this.#shadowRoot = this.attachShadow({ mode: "open", delegatesFocus: true });

    this.#disabled = this.hasAttribute("disabled");
    this.#name = this.getAttribute("name");
    this.type = this.getAttribute("type") ?? "ability";
    this.#value = Number(this.getAttribute("value") ?? 0);
  }

  /**
   * Controller for removing listeners automatically.
   * @type {AbortController}
   */
  #controller;

  /**
   * The custom element's form and accessibility internals.
   * @type {ElementInternals}
   */
  #internals;

  /**
   * Shadow root of the element.
   * @type {ShadowRoot}
   */
  #shadowRoot;

  /* -------------------------------------------- */

  /** @override */
  static formAssociated = true;

  /**
   * The form this element belongs to, if any.
   * @type {HTMLFormElement}
   */
  get form() { return this.#internals.form; }

  /* -------------------------------------------- */

  /**
   * Is the input disabled?
   * @type {boolean}
   */
  #disabled;

  get disabled() { return this.#disabled; }

  set disabled(value) { this.#disabled = value; }

  /* -------------------------------------------- */

  /**
   * The name of the toggle.
   * @type {string}
   */
  #name;

  get name() { return this.#name; }

  set name(value) { this.#name = value; }

  /* -------------------------------------------- */

  /**
   * Type of proficiency represented by this control (e.g. "ability" or "skills").
   * @type {"ability"|"skill"}
   */
  #type;

  get type() { return this.#type; }

  set type(value) {
    if ( !["ability", "skill"].includes(value) ) throw new Error("Type must be 'ability' or 'skill'.");
    this.#type = value;
    this.#internals.ariaValueMin = 0;
    this.#internals.ariaValueMax = this.#type === "ability" ? 1 : 2;
    this.#internals.ariaValueStep = this.#type === "ability" ? 1 : 0.5;
  }

  /* -------------------------------------------- */

  /**
   * Valid values for the current type.
   * @type {number[]}
   */
  get validValues() {
    return this.#type === "ability" ? [0, 1] : [0, 1, .5, 2];
  }

  /* -------------------------------------------- */

  /**
   * The value of the input as it appears in form data.
   * @type {number}
   */
  #value;

  get value() { return this.#value; }

  set value(value) {
    value = Number(value);
    if ( !this.validValues.includes(value) ) throw new Error("Value must be a valid proficiency multiplier.");
    this.#value = value;
    this.#refreshValue();
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    this.replaceChildren();
    this.#buildCSS();
    this.#buildHTML();
    this.#refreshValue();

    const { signal } = this.#controller;
    this.addEventListener("click", this.#onClick.bind(this), { signal });
    this.addEventListener("contextmenu", this.#onClick.bind(this), { signal });
    this.#shadowRoot.querySelector("div").addEventListener("contextmenu", e => e.preventDefault(), { signal });
    this.#shadowRoot.querySelector("input").addEventListener("change", this.#onChangeInput.bind(this), { signal });
  }

  /* -------------------------------------------- */

  /**
   * Build the CSS internals.
   */
  #buildCSS() {
    const style = document.createElement("style");
    style.innerHTML = `
      :host { display: inline-block; }
      div { --_fill: var(--proficiency-cycle-enabled-color, var(--dnd5e-color-blue)); }
      div:has(:disabled, :focus-visible) { --_fill: var(--proficiency-cycle-disabled-color, var(--dnd5e-color-gold)); }
      div:not(:has(:disabled)) { cursor: pointer; }

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
    this.#shadowRoot.appendChild(style);
  }

  /* -------------------------------------------- */

  /**
   * Build the HTML internals.
   */
  #buildHTML() {
    const div = document.createElement("div");
    this.#shadowRoot.appendChild(div);

    const input = document.createElement("input");
    input.setAttribute("type", "number");
    input.setAttribute("autofocus", true);
    if ( this.#disabled ) input.setAttribute("disabled", true);
    div.appendChild(input);
  }

  /* -------------------------------------------- */

  /**
   * Update input and aria attributes based on new input value.
   */
  #refreshValue() {
    const input = this.#shadowRoot.querySelector("input");
    input.setAttribute("value", this.#value);
    this.#internals.ariaValueNow = this.#value;
    this.#internals.ariaValueText = CONFIG.DND5E.proficiencyLevels[this.#value];
    this.#internals.setFormValue(this.#value);
  }

  /* -------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    this.#controller.abort();
  }

  /* -------------------------------------------- */

  /**
   * Change the value by one step, looping around if the limits have been reached.
   * @param {boolean} [up=true]  Should the value step up or down?
   */
  step(up=true) {
    const idx = this.validValues.indexOf(this.value);
    this.value = this.validValues[(idx + (up ? 1 : this.validValues.length - 1)) % this.validValues.length];
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
    this.step(event.type === "click");
  }
}
