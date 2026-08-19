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
   * The full target list popover.
   * @type {HTMLUListElement}
   */
  list;

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
    this.list = document.createElement("ul");
    this.list.classList.add("target-menu", "unlist");
    this.list.popover = "auto";
    this.list.append(...Iterator.from(this.querySelectorAll("option")).map(o => {
      const li = document.createElement("li");
      li.classList.toggle("active", "checked" in o.dataset);
      li.dataset.uuid = o.value;
      li.innerHTML = `
        <button type="button" class="pan-target unbutton"><i class="fa-solid fa-arrows-to-circle" inert></i></button>
        <span class="title"></span>
      `;
      li.querySelector("button").ariaLabel = _loc("DND5E.EFFECT.Action.PanToToken");
      li.querySelector(".title").append(o.textContent);
      return li;
    }));
    this.append(this.list);
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
    const options = this.querySelectorAll("option");
    if ( options.length > 1 ) {
      const uuid = event => event.target.closest("[data-uuid]")?.dataset.uuid;
      // Spawning the popover on right-click is a bit tortured. If we switch to popover="manual" then we need to handle
      // global click listener & Escape handler.
      this.addEventListener("contextmenu", event => {
        event.preventDefault();
        event.stopPropagation();
      }, { signal });
      this.addEventListener("pointerdown", event => {
        if ( (event.button === 2) && !this.disabled ) this.#wasOpen = this.list.matches(":popover-open");
      }, { signal });
      this.addEventListener("pointerup", event => {
        if ( (event.button === 2) && !this.disabled ) setTimeout(() => this.#onToggleMenu());
      }, { signal });
      this.list.addEventListener("click", event => {
        event.stopPropagation();
        if ( event.target.closest(".pan-target") ) return this.#onTargetMouseDown(event, uuid(event));
        this.#onEntryClick(event, uuid(event));
      });
      this.list.addEventListener("pointerover", event => this.#onEntryHoverIn(event, uuid(event)));
      this.list.addEventListener("pointerout", this.#onEntryHoverOut.bind(this));
      this.list.addEventListener("toggle", event => {
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
    this.querySelector(`li[data-uuid="${uuid}"]`).classList.toggle("active");
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

  /* -------------------------------------------- */

  /**
   * Handle toggling the target menu.
   */
  #onToggleMenu() {
    if ( this.#wasOpen ) this.list.hidePopover();
    else this.list.showPopover();
  }
}
