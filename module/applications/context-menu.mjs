/**
 * A specialized subclass of ContextMenu that places the menu in a fixed position.
 * @extends {ContextMenu}
 */
export default class ContextMenu5e extends ContextMenu {
  /** @override */
  _setPosition([html], [target]) {
    const { clientWidth, clientHeight } = document.documentElement;
    const { width, height } = html.getBoundingClientRect();

    // TODO: Improve core ContextMenu class to provide this event rather than using the global event.
    const { clientX, clientY } = window.event;
    const left = Math.min(clientX, clientWidth - width);
    this._expandUp = clientY + height > clientHeight;
    const top = this._expandUp ? clientY - height : clientY;
    html.classList.add("dnd5e2");
    html.classList.toggle("expand-up", this._expandUp);
    html.classList.toggle("expand-down", !this._expandUp);
    html.style.visibility = "";
    html.style.left = `${left}px`;
    html.style.top = `${top}px`;
    target.classList.add("context");
    document.body.appendChild(html);
  }
}
