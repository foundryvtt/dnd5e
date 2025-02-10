import { setTheme } from "../settings.mjs";

/**
 * A specialized subclass of ContextMenu that places the menu in a fixed position.
 * @extends {ContextMenu}
 */
export default class ContextMenu5e extends (foundry.applications?.ui?.ContextMenu ?? ContextMenu) {
  /** @override */
  _setPosition(html, target, options={}) {
    if ( game.release.generation > 12 ) {
      html.classList.add("dnd5e2");
      return this._setFixedPosition(html, target, options);
    } else {
      html = html[0];
      target = target[0];
    }
    document.body.appendChild(html);
    const { clientWidth, clientHeight } = document.documentElement;
    const { width, height } = html.getBoundingClientRect();

    // TODO: Improve core ContextMenu class to provide this event rather than using the global event.
    const { clientX, clientY } = window.event;
    const left = Math.min(clientX, clientWidth - width);
    this._expandUp = clientY + height > clientHeight;
    html.classList.add("dnd5e2");
    html.classList.toggle("expand-up", this._expandUp);
    html.classList.toggle("expand-down", !this._expandUp);
    html.style.visibility = "";
    html.style.left = `${left}px`;
    if ( this._expandUp ) html.style.bottom = `${clientHeight - clientY}px`;
    else html.style.top = `${clientY}px`;
    target.classList.add("context");
    const theme = target.closest("[data-theme]")?.dataset.theme ?? "";
    setTheme(html, theme);
  }
}
