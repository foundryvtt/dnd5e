/**
 * Compendium with added support for item containers.
 */
export default class ItemCompendium5e extends Compendium {
  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    // Re-index with "system.container" and re-build tree
    context.index = await this.collection.getIndex();
    this.collection.initializeTree();
    context.tree = this.collection.tree;

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _handleDroppedEntry(target, data) {
    // Obtain the dropped Document
    let item = await Item.fromDropData(data);
    if ( !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( !this._entryAlreadyExists(item) ) item = await this.collection.importDocument(item);

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }
}
