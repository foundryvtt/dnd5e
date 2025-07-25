import AdoptedStyleSheetMixin from "./adopted-stylesheet-mixin.mjs";

/**
 * A custom checkbox implementation with more styling options.
 * @mixes AdoptedStyleSheetMixin
 * @extends {AbstractFormInputElement}
 */
export default class CheckboxElement extends AdoptedStyleSheetMixin(
  foundry.applications.elements.AbstractFormInputElement
) {
  constructor(...args) {
    super(...args);
    this._internals.role = "checkbox";
    this._value = this.getAttribute("value");
    this.#defaultValue = this._value;
    if ( this.constructor.useShadowRoot ) this.#shadowRoot = this.attachShadow({ mode: "closed" });
  }

  /* -------------------------------------------- */

  /** @override */
  static tagName = "dnd5e-checkbox";

  /* -------------------------------------------- */

  /**
   * Should a show root be created for this element?
   */
  static useShadowRoot = true;

  /* -------------------------------------------- */

  /** @override */
  static CSS = `
    :host {
      cursor: var(--cursor-pointer);
      display: inline-block;
      width: var(--checkbox-size, 18px);
      height: var(--checkbox-size, 18px);
      aspect-ratio: 1;
    }

    :host(:disabled) { cursor: var(--cursor-default); }

    :host > div {
      width: 100%;
      height: 100%;
      border-radius: var(--checkbox-border-radius, 3px);
      border: var(--checkbox-border-width, 2px) solid var(--checkbox-border-color, var(--dnd5e-color-gold));
      background: var(--checkbox-empty-color, transparent);
      box-sizing: border-box;
      position: relative;
    }

    :host :is(.checked, .disabled, .indeterminate) {
      display: none;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
    }

    :host([checked]) :is(.checked, .disabled, .indeterminate) {
      background: var(--checkbox-fill-color, var(--dnd5e-color-gold));
    }

    :host([checked]) .checked { display: flex; }
    :host([indeterminate]) .indeterminate { display: flex; }
    :host([indeterminate]) .checked { display: none; }
    :host(:disabled) .disabled { display: flex; }
    :host(:disabled) .checked { display: none; }
    :host(:disabled) .indeterminate { display: none; }
  `;

  /* -------------------------------------------- */

  /**
   * Controller for removing listeners automatically.
   * @type {AbortController}
   */
  _controller;

  /* -------------------------------------------- */

  /**
   * The shadow root that contains the checkbox elements.
   * @type {ShadowRoot}
   */
  #shadowRoot;

  /* -------------------------------------------- */
  /*  Element Properties                          */
  /* -------------------------------------------- */

  /**
   * The default value as originally specified in the HTML that created this object.
   * @type {string}
   */
  get defaultValue() {
    return this.#defaultValue;
  }

  #defaultValue;

  /* -------------------------------------------- */

  /**
   * The indeterminate state of the checkbox.
   * @type {boolean}
   */
  get indeterminate() {
    return this.hasAttribute("indeterminate");
  }

  set indeterminate(indeterminate) {
    this.toggleAttribute("indeterminate", indeterminate);
  }

  /* -------------------------------------------- */

  /**
   * The checked state of the checkbox.
   * @type {boolean}
   */
  get checked() {
    return this.hasAttribute("checked");
  }

  set checked(checked) {
    this.toggleAttribute("checked", checked);
    this._refresh();
  }

  /* -------------------------------------------- */

  /** @override */
  get value() {
    return super.value;
  }

  /**
   * Override AbstractFormInputElement#value setter because we want to emit input/change events when the checked state
   * changes, and not when the value changes.
   * @override
   */
  set value(value) {
    this._setValue(value);
  }

  /** @override */
  _getValue() {
    // Workaround for FormElementExtended only checking the value property and not the checked property.
    if ( typeof this._value === "string" ) return this._value;
    return this.checked;
  }

  /* -------------------------------------------- */
  /*  Element Lifecycle                           */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    this._adoptStyleSheet(this._getStyleSheet());
    const elements = this._buildElements();
    this.#shadowRoot.replaceChildren(...elements);
    this._refresh();
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
  _adoptStyleSheet(sheet) {
    if ( this.constructor.useShadowRoot ) this.#shadowRoot.adoptedStyleSheets = [sheet];
  }

  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="checked">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
             style="fill: var(--checkbox-icon-color, #000); width: var(--checkbox-icon-size, 68%);">
          <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
          <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
        </svg>
      </div>
      <div class="disabled">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
             style="fill: var(--checkbox-icon-color, #000); width: var(--checkbox-icon-size, 68%);">
          <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
          <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
        </svg>
      </div>
      <div class="indeterminate">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
             style="fill: var(--checkbox-icon-color, #000); width: var(--checkbox-icon-size, 68%);">
          <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
          <path d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/>
        </svg>
      </div>
    `;
    return [container];
  }

  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    const { signal } = this._controller = new AbortController();
    this.addEventListener("click", this._onClick.bind(this), { signal });
    this.addEventListener("keydown", event => event.key === " " ? this._onClick(event) : null, { signal });
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    super._refresh();
    this._internals.ariaChecked = `${this.hasAttribute("checked")}`;
  }

  /* -------------------------------------------- */

  /** @override */
  _onClick(event) {
    event.preventDefault();
    this.checked = !this.checked;
    this.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }
}
