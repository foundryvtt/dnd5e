/**
 * A FilterMenu implementation for listing a group of targets.
 */
export default class TargetMenu extends foundry.applications.ux.FilterMenu {

  /** @inheritDoc */
  _onActivate(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if ( this.element?.isConnected ) return this.close();
    return super._onActivate(event);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRenderEntries(menu, options) {
    await super._onRenderEntries(menu, options);
    this.element.classList.add("dnd5e2");
    this.menuItems.forEach(entry => {
      const { element, onHoverIn, onHoverOut } = entry;
      if ( onHoverIn ) element.addEventListener("pointerenter", onHoverIn);
      if ( onHoverOut ) element.addEventListener("pointerleave", onHoverOut);
    });
  }
}
