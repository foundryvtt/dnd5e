/**
 * Items sidebar with added support for item containers.
 */
export default class ItemDirectory5e extends ItemDirectory {
  /** @inheritdoc */
  initialize() {
    // Assign Folders
    this.folders = game.folders.filter(f => f.type === this.constructor.documentName);

    // Assign Documents
    this.documents = this.constructor.collection.filter(e =>
      e.visible && !this.constructor.collection.has(e.system.container)
    );

    // Build Tree
    this.tree = this.constructor.setupFolders(this.folders, this.documents);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _handleDroppedDocument(target, data) {
    // Determine the closest Folder
    const closestFolder = target ? target.closest(".folder") : null;
    if ( closestFolder ) closestFolder.classList.remove("droptarget");
    let folder = closestFolder ? game.folders.get(closestFolder.dataset.folderId) : null;

    // Obtain the dropped Document
    let item = await Item.fromDropData(data);
    if ( !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( !item.id || item.pack || item.isEmbedded ) {
      const contents = await item.system.contents;
      item = await Item.create(item.toObject());

      // Copy over item's contents if it is a container
      if ( contents ) {
        const contentsData = contents.reduce((arr, c) => {
          arr.push(foundry.utils.mergeObject(c.toObject(), {"system.container": item.id}));
          return arr;
        }, []);
        await Item.createDocuments(contentsData);
      }
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Sort relative to another Document
    const sortData = {sortKey: "sort"};
    const isRelative = target && target.dataset.documentId;
    if ( isRelative ) {
      if ( item.id === target.dataset.documentId ) return; // Don't drop on yourself
      const targetDocument = game.items.get(target.dataset.documentId);
      sortData.target = targetDocument;
      folder = targetDocument.folder;
    }

    // Sort within to the closest Folder
    else sortData.target = null;

    // Determine siblings and perform sort
    sortData.siblings = game.items.filter(doc => (doc.id !== item.id) && (doc.folder === folder));
    sortData.updateData = {folder: folder?.id || null};
    return item.sortRelative(sortData);
  }
}
