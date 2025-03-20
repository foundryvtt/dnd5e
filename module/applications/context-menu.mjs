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
}
