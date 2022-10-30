/**
 * Compendium with added support for item containers.
 */
export default class ItemCompendium5e extends Compendium {
  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);

    // Filter out items within containers
    context.index = context.index.filter(i => !this.collection.index.has(i.system?.container));

    return context;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const item = await Item.fromDropData(data);

    if ( item.pack === this.collection.collection ) {
      // If item already exists in compendium outside container, do nothing
      if ( !item.system.collection ) return false;

      // If item is within another container in this collection, update
      return item.update({"system.collection": null});
    }

    const newItem = await this.collection.importDocument(item);

    // Copy over item's contents if it is a container
    const contents = await item.system.contents;
    const options = { clearOwnership: this.collection.metadata.packageType === "world" };
    if ( contents ) {
      const contentsData = contents.reduce((arr, c) => {
        const data = c.toCompendium(this.collection, options);
        arr.push(foundry.utils.mergeObject(data, {"system.container": newItem.id}));
        return arr;
      }, []);
      await Item.createDocuments(contentsData, {pack: this.collection.collection});
    }

    return newItem;
  }
}
