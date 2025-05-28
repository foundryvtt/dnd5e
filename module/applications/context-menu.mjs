/**
 * A specialized subclass of ContextMenu that places the menu in a fixed position.
 * @extends {ContextMenu}
 */
export default class ContextMenu5e extends foundry.applications.ux.ContextMenu {
  /** @override */
  _setPosition(html, target, options={}) {
    html.classList.add("dnd5e2");
    return this._setFixedPosition(html, target, options);
  }

  /* -------------------------------------------- */

  /**
   * Trigger a context menu event in response to a normal click on a additional options button.
   * @param {PointerEvent} event
   */
  static triggerEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    const { clientX, clientY } = event;
    const selector = "[data-id],[data-effect-id],[data-item-id],[data-message-id]";
    const target = event.target.closest(selector) ?? event.currentTarget.closest(selector);
    target?.dispatchEvent(new PointerEvent("contextmenu", {
      view: window, bubbles: true, cancelable: true, clientX, clientY
    }));
  }
}
