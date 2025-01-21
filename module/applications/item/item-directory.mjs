import Item5e from "../../documents/item.mjs";
import ItemSheet5e2 from "./item-sheet-2.mjs";

/**
 * Items sidebar with added support for item containers.
 */
export default class ItemDirectory5e extends ItemDirectory {
  /** @inheritDoc */
  async _handleDroppedEntry(target, data) {
    // Obtain the dropped Document
    let item = await this._getDroppedEntryFromData(data);
    if ( !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( !this._entryAlreadyExists(item) ) {
      const toCreate = await Item5e.createWithContents([item]);
      const folder = target?.closest("[data-folder-id]")?.dataset.folderId;
      if ( folder ) toCreate.map(d => d.folder = folder);
      [item] = await Item5e.createDocuments(toCreate, {keepId: true});
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }

  /* -------------------------------------------- */

  /** @override */
  async _onClickEntryName(event) {
    const { entryId } = event.target.closest("[data-entry-id]")?.dataset ?? {};
    const item = this.collection.get(entryId);
    item?.sheet.render(true, { mode: ItemSheet5e2.MODES.EDIT });
  }
}
