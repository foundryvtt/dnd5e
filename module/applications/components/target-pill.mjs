import TargetsField from "../../data/chat-message/fields/targets-field.mjs";

/**
 * @import {
 *   TargetPillMenuCallback, TargetPillMenuEntryCallback, TargetPillMenuEntryClickCallback
 * } from "./_types.mjs";
 */

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
   * Whether this pill has a right-click context menu.
   * @type {boolean}
   */
  get hasMenu() {
    return this.hasAttribute("menu") || (this.querySelectorAll("option").length > 1);
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
   * A callback to invoke when building a menu entry.
   * @type {TargetPillMenuEntryCallback}
   */
  onBuildMenuEntry;

  /* -------------------------------------------- */

  /**
   * A callback to invoke when building the target pane.
   * @type {TargetPillMenuCallback}
   */
  onBuildPane;

  /* -------------------------------------------- */

  /**
   * A callback to invoke when a menu entry is clicked.
   * @type {TargetPillMenuEntryClickCallback}
   */
  onEntryClick;

  /* -------------------------------------------- */

  /**
   * The full target list popover.
   * @type {HTMLElement}
   */
  pane;

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
   * Convenience getter to retrieve all contained target UUIDs. Use value to retrieve only the selected ones.
   * @type {string[]}
   */
  get targets() {
    return Iterator.from(this.querySelectorAll("option")).map(el => el.value).toArray();
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
   * State management for the popover.
   * @type {boolean}
   */
  #wasOpen = false;

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Build the contents of the target pane.
   */
  buildPane() {
    this.pane.replaceChildren();
    const menu = document.createElement("menu");
    menu.classList.add("target-entries", "unlist");
    this.pane.append(menu);
    if ( typeof this.onBuildPane === "function" ) this.onBuildPane(this, this.pane);
    if ( typeof this.onBuildMenuEntry === "function" ) {
      menu.append(...Iterator.from(this.querySelectorAll("option")).map(o => this.onBuildMenuEntry(this, {
        checked: "checked" in o.dataset, name: o.textContent, uuid: o.value
      })).filter(_ => _));
    }
  }

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
    this.pane = document.createElement("div");
    this.pane.classList.add("target-pane");
    this.pane.popover = "auto";
    this.buildPane();
    this.append(this.pane);
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
    this.addEventListener("keydown", event => {
      if ( event.key === " " ) this._onClick(event);
    }, { signal });
    if ( this.hasMenu ) {
      const uuid = event => event.target.closest("[data-uuid]")?.dataset.uuid;
      // Spawning the popover on right-click is a bit tortured. If we switch to popover="manual" then we need to handle
      // global click listener & Escape handler.
      this.addEventListener("contextmenu", event => {
        event.preventDefault();
        event.stopPropagation();
      }, { signal });
      this.addEventListener("pointerdown", event => {
        if ( (event.button === 2) && !this.disabled ) this.#wasOpen = this.pane.matches(":popover-open");
      }, { signal });
      this.addEventListener("pointerup", event => {
        if ( (event.button === 2) && !this.disabled ) setTimeout(() => this.#onToggleMenu());
      }, { signal });
      this.pane.addEventListener("click", event => {
        if ( event.target.closest(".pan-target") ) {
          event.stopPropagation();
          return this.#onTargetMouseDown(event, uuid(event));
        }
        if ( typeof this.onEntryClick === "function" ) this.onEntryClick(this, event);
        if ( event.defaultPrevented ) event.stopPropagation();
        else this.#onEntryClick(event, uuid(event));
      });
      this.pane.addEventListener("pointerover", event => this.#onEntryHoverIn(event, uuid(event)));
      this.pane.addEventListener("pointerout", this.#onEntryHoverOut.bind(this));
      this.pane.addEventListener("toggle", event => {
        if ( event.newState === "closed" ) this.#onEntryHoverOut();
      });
    }
    const { target } = this;
    if ( target ) {
      this.addEventListener("pointerenter", event => this.#onEntryHoverIn(event, target), { signal });
      this.addEventListener("pointerleave", this.#onEntryHoverOut.bind(this), { signal });
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onClick(event) {
    if ( this.disabled || event.target.closest(".target-pane") ) return;
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
    const entry = this.querySelector(`[value="${uuid}"]`);
    if ( entry ) {
      entry.toggleAttribute("data-checked");
      this.#update();
    }
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

  /* -------------------------------------------- */

  /**
   * Handle toggling the target menu.
   */
  #onToggleMenu() {
    if ( !this.isConnected ) return;
    if ( this.#wasOpen ) this.pane.hidePopover();
    else {
      ui.context?.close({ animate: false });
      this.pane.showPopover();
    }
  }
}
