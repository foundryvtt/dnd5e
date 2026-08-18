import TargetMenu from "./target-menu.mjs";
import TargetsField from "../../data/chat-message/fields/targets-field.mjs";

/**
 * A custom element that represents a grouping of one or more potential targets.
 */
export default class TargetPillElement extends foundry.applications.elements.AbstractFormInputElement {

  constructor() {
    super();
    this._internals.role = "checkbox";
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The HTML tag name used by this element.
   * @type {string}
   */
  static tagName = "target-pill";

  /* -------------------------------------------- */

  /**
   * The checked state of the pill.
   * @type {boolean}
   */
  get checked() {
    if ( !this.toggle ) return false;
    return this.#determineState().checked;
  }

  set checked(checked) {
    this.querySelectorAll("option").forEach(o => o.toggleAttribute("data-checked", checked));
    this.#update();
  }

  /* -------------------------------------------- */

  /**
   * The indeterminate state of the pill.
   * @type {boolean}
   */
  get indeterminate() {
    return this.#determineState().indeterminate;
  }

  /* -------------------------------------------- */

  /**
   * The pill's indicator pip.
   * @type {HTMLDivElement}
   */
  pip;

  /* -------------------------------------------- */

  /**
   * Convenience getter to retrieve the single target UUID if this pill represents only one.
   * @type {string|null}
   */
  get target() {
    const options = this.querySelectorAll("option");
    if ( options.length !== 1 ) return null;
    return options[0].value;
  }

  /* -------------------------------------------- */

  /**
   * Whether this pill is toggleable.
   * @type {boolean}
   */
  get toggle() {
    return this.hasAttribute("toggle");
  }

  set toggle(toggle) {
    this.toggleAttribute("toggle", toggle);
  }

  /* -------------------------------------------- */

  /**
   * The currently highlighted token.
   * @type {TokenDocument5e|null}
   */
  #highlighted = null;

  /* -------------------------------------------- */

  /**
   * The bound TargetMenu instance.
   * @type {TargetMenu}
   */
  #menu;

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    super.connectedCallback?.();
    if ( !this.hasAttribute("tabindex") ) this.tabIndex = 0;
  }

  /* -------------------------------------------- */

  /** @override */
  _buildElements() {
    if ( this.pip ) return this.children;
    this.classList.add("target", "pill");
    this.pip = document.createElement("div");
    this.pip.classList.add("pip");
    this.append(this.pip);
    return this.children;
  }

  /* -------------------------------------------- */

  /** @override */
  _getValue() {
    return Iterator.from(this.querySelectorAll("[data-checked]")).map(el => el.value).toArray();
  }

  /* -------------------------------------------- */

  /** @override */
  _refresh() {
    super._refresh();
    const { checked, indeterminate } = this.#determineState();
    this.toggleAttribute("checked", checked);
    this.toggleAttribute("indeterminate", indeterminate);
    this._internals.ariaChecked = indeterminate ? "mixed" : `${checked}`;
  }

  /* -------------------------------------------- */

  /** @override */
  _toggleDisabled(disabled) {
    this.tabIndex = disabled ? -1 : 0;
    this._internals.ariaDisabled = `${disabled}`;
  }

  /* -------------------------------------------- */

  /**
   * Determine the state of the pill from its members.
   * @returns {{ checked: boolean, indeterminate: boolean }}
   */
  #determineState() {
    let checked = true;
    let indeterminate = false;
    for ( const option of this.querySelectorAll("option") ) {
      const optionChecked = "checked" in option.dataset;
      if ( optionChecked ) indeterminate = true;
      checked &&= optionChecked;
    }
    if ( checked ) indeterminate = false;
    return { checked, indeterminate };
  }

  /* -------------------------------------------- */

  /**
   * Prepare individual target entries.
   * @returns {ContextMenuEntry[]}
   */
  #getTargetContextOptions() {
    const options = this.querySelectorAll("option");
    if ( this.disabled || (options.length < 2) ) return [];
    return Iterator.from(options).map(o => ({
      classes: ["filter-item", "checked" in o.dataset ? "active" : ""].filterJoin(" "),
      label: o.textContent,
      onClick: event => this.#onEntryClick(event, o.value),
      onHoverIn: event => this.#onEntryHoverIn(event, o.value),
      onHoverOut: this.#onEntryHoverOut.bind(this)
    })).toArray();
  }

  /* -------------------------------------------- */

  /**
   * Update the element's internal value state.
   */
  #update() {
    this.value = this._getValue();
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /** @override */
  _activateListeners() {
    const signal = this.abortSignal;
    this.#menu ??= new TargetMenu(this, this.constructor.tagName, {
      eventName: "contextmenu",
      menuItems: this.#getTargetContextOptions.bind(this),
      onClose: this.#onEntryHoverOut.bind(this)
    });
    this.addEventListener("keydown", event => {
      if ( event.key === " " ) this._onClick(event);
    }, { signal });
    const uuid = this.target;
    if ( uuid ) {
      this.addEventListener("pointerenter", event => this.#onEntryHoverIn(event, uuid), { signal });
      this.addEventListener("pointerleave", event => this.#onEntryHoverOut(event, uuid), { signal });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onClick(event) {
    if ( this.disabled ) return;
    event.preventDefault();
    if ( this.toggle ) this.checked = !this.checked;
    else return this.#onTargetMouseDown(event, this.target);
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking an entry in the target menu.
   * @param {PointerEvent} event  The triggering event.
   * @param {string} uuid         The target UUID.
   */
  #onEntryClick(event, uuid) {
    this.querySelector(`[value="${uuid}"]`)?.toggleAttribute("data-checked");
    this.#update();
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering an entry in the target menu.
   * @param {PointerEvent} event  The triggering event.
   * @param {string} uuid         The target UUID.
   */
  #onEntryHoverIn(event, uuid) {
    const token = fromUuidSync(uuid)?.object;
    if ( token && token._canHover(game.user, event) && token.visible ) {
      token._onHoverIn(event, { hoverOutOthers: true });
      this.#highlighted = token;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering out of a target menu entry.
   */
  #onEntryHoverOut() {
    this.#highlighted?._onHoverOut();
    this.#highlighted = null;
  }

  /* -------------------------------------------- */

  /**
   * Handle target selection and panning.
   * @param {PointerEvent} event  The triggering event.
   * @param {string|null} uuid    The target UUID.
   * @returns {Promise}
   */
  async #onTargetMouseDown(event, uuid) {
    event.stopPropagation();
    const { actor, token } = TargetsField.resolve({ token: uuid });
    if ( !token || !actor?.testUserPermission(game.user, "OBSERVER") ) return;
    const releaseOthers = !event.shiftKey;
    if ( token.controlled ) token.release();
    else {
      token.control({ releaseOthers });
      return canvas.animatePan(token.center);
    }
  }
}
