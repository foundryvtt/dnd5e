import Item5e from "../../documents/item.mjs";

/**
 * Items sidebar with added support for item containers.
 */
export default class ItemDirectory5e extends ItemDirectory {
  /** @inheritdoc */
  async _handleDroppedEntry(target, data) {
    // Obtain the dropped Document
    let item = await this._getDroppedEntryFromData(data);
    if ( !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( !this._entryAlreadyExists(item) ) {
      const toCreate = await Item5e.createWithContents([item]);
      [item] = await Item5e.createDocuments(toCreate, {keepId: true});
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }
}
