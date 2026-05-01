import AdvancementConfig from "./advancement-config-v2.mjs";

/**
 * Shared base configuration application for Item Grant & Item Choice advancement.
 */
export default class ItemSharedConfig extends AdvancementConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      sort: ItemSharedConfig.#toggleSorting
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.manualSort = this.advancement.configuration.sorting === "m";
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle toggling the sorting on the item list.
   * @this {ItemSharedConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #toggleSorting(event, target) {
    const sorting = this.advancement.configuration.sorting === "m" ? "a" : "m";
    this.submit({ updateData: { configuration: { sorting } }});
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  async _onDragStart(event) {
    const row = event.target.closest("[data-item-uuid]");
    const uuid = row?.dataset.itemUuid;
    if ( !uuid ) return;
    const box = row.getBoundingClientRect();
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "row", uuid }));
    event.dataTransfer.setDragImage(row, box.width - 6, box.height / 2);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const items = foundry.utils.getProperty(this.advancement.configuration, this.options.dropKeyPath);
    if ( data?.type !== "row" ) return super._onDrop(event);

    const dropArea = event.target.closest("[data-item-uuid]");
    const dragEntry = items.find(i => i.uuid === data.uuid);
    if ( !dragEntry ) return;

    let target = items.find(i => i.uuid === dropArea?.dataset.itemUuid);
    let sortBefore;

    // If dropped outside any entry, sort to top or bottom of list
    if ( !target ) {
      const box = this.element.querySelector('[data-application-part="items"]').getBoundingClientRect();
      sortBefore = (event.clientY - box.y) < (box.height * .5);
      const sortedEntries = items.sort((lhs, rhs) => lhs.sort - rhs.sort);
      target = sortBefore ? sortedEntries[0] : sortedEntries.at(-1);
    }

    if ( !target || (target === dragEntry) ) return;

    const siblings = items.filter(i => i.uuid !== dragEntry.uuid);
    const sortUpdates = foundry.utils.performIntegerSort(dragEntry, { target, siblings, sortBefore });
    const updatedItems = [];
    for ( const item of items ) {
      const update = sortUpdates.find(u => u.target.uuid === item.uuid);
      if ( update ) item.sort = update.update.sort;
      updatedItems.push(item);
    }
    await this.advancement.update({ [`configuration.${this.options.dropKeyPath}`]: updatedItems });
  }

  /* -------------------------------------------- */

  /** @override */
  _validateDroppedItem(event, item) {
    this.advancement._validateItemType(item);
  }
}
