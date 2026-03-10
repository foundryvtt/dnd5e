import { COMPARISON_FUNCTIONS, OPERATOR_FUNCTIONS } from "../../filter.mjs";
import { getHumanReadableAttributeLabel } from "../../utils.mjs";
import FiltersEditor from "../filters-editor.mjs";

/**
 * Element for displaying and editing filters.
 * @extends {AbstractFormInputElement}
 */
export default class FiltersInputElement extends foundry.applications.elements.AbstractFormInputElement {

  /** @override */
  static tagName = "filters-input";

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Element containing the filters breakdown.
   * @type {HTMLElement}
   */
  #breakdown;

  /* -------------------------------------------- */

  /**
   * Element for opening the editor.
   * @type {HTMLButtonElement}
   */
  #button;

  /* -------------------------------------------- */

  /**
   * Editor instance opened by this input.
   * @type {FiltersConfig}
   */
  #editor;

  /* -------------------------------------------- */

  /** @override */
  _toggleDisabled(disabled) {
    this.#button.disabled = disabled;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    this._value ??= this.getAttribute("value") || this.innerText || "{}";

    // Create filter breakdown
    this.#breakdown = document.createElement("filters-breakdown");
    this.#refreshBreakdown();

    // Create button for opening editor
    const b = this.#button = document.createElement("button");
    Object.assign(b, { ariaLabel: game.i18n.localize("DND5E.FILTER.Action.Edit"), type: "button" });
    b.classList.add("icon", "fa-solid", "fa-filter");
    b.dataset.tooltip = "";

    return [this.#breakdown, this.#button];
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    this.#refreshBreakdown();
  }

  /* -------------------------------------------- */

  /**
   * Render the filters breakdown.
   */
  #refreshBreakdown() {
    let filters;
    try {
      filters = JSON.parse(this.value);
    } catch(err) {
      this.#breakdown.innerText = game.i18n.localize("DND5E.FILTER.Invalid");
      return;
    }

    if ( foundry.utils.isEmpty(filters) ) {
      this.#breakdown.innerText = game.i18n.localize("DND5E.FILTER.Empty");
      return;
    }

    if ( !Array.isArray(filters) ) filters = [filters];
    this.#breakdown.replaceChildren(...filters.map(f => this.#renderBreakdownNode(f)).filter(_ => _));
  }

  /* -------------------------------------------- */

  /**
   * Turn a single filter node into an breakdown element.
   * @param {FilterDescription} filter
   * @returns {HTMLElement|void}
   */
  #renderBreakdownNode(filter) {
    let { k: key, o: operator="exact", v: value } = filter;
    if ( !value ) return;

    // If in OPERATOR_FUNCTIONS, create group and recurse
    if ( operator in OPERATOR_FUNCTIONS ) {
      const node = document.createElement("filter-operator");
      node.setAttribute("operator", operator);
      if ( !Array.isArray(value) ) value = [value];
      node.replaceChildren(...value.map(v => this.#renderBreakdownNode(v)).filter(_ => _));
      return node;
    }

    // If in COMPARISON_FUNCTIONS, create entry
    if ( operator in COMPARISON_FUNCTIONS ) {
      const node = document.createElement("filter-comparison");
      node.setAttribute("operator", operator);
      const keyElement = document.createElement("filter-key");
      keyElement.innerText = getHumanReadableAttributeLabel(key) ?? key;
      const valueElement = document.createElement("filter-value");
      valueElement.innerText = Array.isArray(value) ? value.join(", ") : value;
      node.replaceChildren(keyElement, valueElement);
      return node;
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    this.#button.addEventListener("click", this.#onOpenEditor.bind(this), { signal: this.abortSignal });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the filters config application for this input.
   * @param {PointerEvent} event  Triggering click event.
   */
  #onOpenEditor(event) {
    event.preventDefault();
    const edit = new Event("edit", { bubbles: true, cancelable: true });
    this.dispatchEvent(edit);
    if ( edit.defaultPrevent ) return;

    this.#editor = new FiltersEditor({ value: this.value });
    this.#editor.addEventListener("close", () => {
      this.value = this.#editor.value;
      this.#editor = undefined;
    }, { once: true });
    this.#editor.render({ force: true });
  }

  /* -------------------------------------------- */
  /*  Factory Methods                             */
  /* -------------------------------------------- */

  /**
   * Create a `<filters-input>` element for a FiltersField.
   * @param {FormInputConfig<string>} config
   * @returns {FiltersInputElement}
   */
  static create(config) {
    const input = new this();
    if ( config.value ) input.setAttribute("value", config.value);
    foundry.applications.fields.setInputAttributes(input, config);
    return input;
  }
}

/* -------------------------------------------- */

/**
 * Small custom element to insert separators between elements in the comparison.
 */
class FilterOperatorElement extends HTMLElement {

  static {
    window.customElements.define("filter-operator", FilterOperatorElement);
  }

  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    const operator = this.getAttribute("operator");
    const symbol = operator?.endsWith("AND") ? game.i18n.localize("DND5E.FILTER.Operator.And")
      : operator?.endsWith("OR") ? game.i18n.localize("DND5E.FILTER.Operator.Or") : null;
    if ( symbol ) this.querySelectorAll(":is(filter-comparison, filter-operator):not(:last-child)").forEach(e =>
      e.insertAdjacentHTML("afterend", `<span class="seperator">${symbol}</span>`)
    );
    if ( operator?.startsWith("N") ) this.insertAdjacentHTML(
      "afterbegin", `<span class="seperator">${game.i18n.localize("DND5E.FILTER.Operator.Not")}`
    );
  }

  /* -------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    this.querySelectorAll(".seperator").forEach(e => e.remove());
  }
}
