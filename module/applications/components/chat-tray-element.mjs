/**
 * Custom element designed to display as a collapsible tray in chat.
 */
export default class ChatTrayElement extends HTMLElement {

  static observedAttributes = ["open"];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Is the tray expanded or collapsed?
   * @type {boolean}
   */
  get open() {
    return this.hasAttribute("open");
  }

  set open(open) {
    if ( open ) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  attributeChangedCallback(name, oldValue, newValue) {
    if ( name === "open" ) this._handleToggleOpen(newValue !== null);
  }

  /* -------------------------------------------- */

  /**
   * Handle clicks to the collapsible header.
   * @param {PointerEvent} event  Triggering click event.
   */
  _handleClickHeader(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if ( !event.target.closest(".collapsible-content") ) this.toggleAttribute("open");
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the collapsed state of this element.
   * @param {boolean} open  Is the element open?
   */
  _handleToggleOpen(open) {
    this.dispatchEvent(new Event("toggle"));

    this.querySelector(".collapsible")?.classList.toggle("collapsed", !open);

    // Clear the height from the chat popout container so that it appropriately resizes.
    const popout = this.closest(".chat-popout");
    if ( popout ) popout.style.height = "";
  }
}
