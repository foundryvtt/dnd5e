import Item5e from "../../documents/item.mjs";
import ItemSheet5e2 from "./item-sheet-2.mjs";

/**
 * Compendium with added support for item containers.
 */
export default class ItemCompendium5e extends Compendium {

  /** @inheritDoc */
  async _render(...args) {
    await super._render(...args);
    let items = this.collection;
    if ( this.collection.index ) {
      if ( !this.collection._reindexing ) this.collection._reindexing = this.collection.getIndex();
      await this.collection._reindexing;
      items = this.collection.index;
    }
    for ( const item of items ) {
      if ( items.has(item.system?.container) ) {
        this._element?.[0].querySelector(`[data-entry-id="${item._id}"]`)?.remove();
      }
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleDroppedEntry(target, data) {
    // Obtain the dropped Document
    let item = await Item.fromDropData(data);
    if ( !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( !this._entryAlreadyExists(item) ) {
      const contents = await item.system.contents;
      if ( contents?.size ) {
        const toCreate = await Item5e.createWithContents([item], {transformAll: item => item.toCompendium(item)});
        const folder = target?.closest("[data-folder-id]")?.dataset.folderId;
        if ( folder ) toCreate.map(d => d.folder = folder);
        [item] = await Item5e.createDocuments(toCreate, {pack: this.collection.collection, keepId: true});
      }
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
    const item = await this.collection.getDocument?.(entryId);
    item?.sheet.render(true, { mode: this.collection.locked ? ItemSheet5e2.MODES.PLAY : ItemSheet5e2.MODES.EDIT });
  }
}
