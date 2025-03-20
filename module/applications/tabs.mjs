/**
 * A specialized subclass of Tabs that handles tabs which exist outside an Application's inner HTML.
 * @extends {Tabs}
 */
export default class Tabs5e extends foundry.applications.ux.Tabs {
  /** @override */
  bind(html) {
    if ( !this._nav ) {
      this._nav = html.closest(".app")?.querySelector(this._navSelector);
      this._nav?.addEventListener("click", this._onClickNav.bind(this));
    }
    if ( !this._nav ) return;
    if ( !this._contentSelector ) this._content = null;
    else if ( html.matches(this._contentSelector) ) this._content = html;
    else this._content = html.querySelector(this._contentSelector);
    this.activate(this.active);
  }
}
