import ItemListControlsElement from "./item-list-controls.mjs";

export default class FilterMenu extends foundry.applications.ux.ContextMenu {
  /**
   * Handle applying a filter.
   * @param {ItemListControlsElement} controls  The parent list controls element.
   * @param {PointerEvent} event                The triggering event.
   */
  #onClickItem(controls, event) {
    event.preventDefault();
    event.stopPropagation();
    const { filter } = event.target.closest("[data-filter]")?.dataset ?? {};
    if ( !filter ) return;
    const { state } = controls;
    const { properties } = state;
    if ( properties.has(filter) ) properties.delete(filter);
    else properties.add(filter);
    this.#renderEntries(controls);
    controls._applyFilters();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async render(target, options={}) {
    await super.render(target, options);
    this.element.classList.add("dnd5e2");
    const controls = options.event?.currentTarget;
    if ( !(controls instanceof ItemListControlsElement) ) return;
    this.#renderEntries(controls);
    this._setPosition(this.element, target, options);
    game.tooltip.deactivate();
    if ( options.animate !== false ) await this._animate(true);
    return this._onRender(options);
  }

  /* -------------------------------------------- */

  /**
   * Render the filter menu's entries.
   * @param {ItemListControlsElement} controls  The parent list controls element.
   */
  #renderEntries(controls) {
    const { filters, state } = controls;
    if ( foundry.utils.isEmpty(filters) ) return;
    const menu = document.createElement("menu");
    menu.classList.add("context-items");
    for ( const [filter, label] of Object.entries(filters) ) {
      const item = document.createElement("li");
      item.dataset.filter = filter;
      item.classList.add("context-item", "filter-item", "always-interactive");
      item.classList.toggle("active", state.properties.has(filter));
      const span = document.createElement("span");
      span.append(label);
      item.append(span);
      menu.append(item);
    }
    menu.addEventListener("click", this.#onClickItem.bind(this, controls));
    this.element.replaceChildren(menu);
  }
}
