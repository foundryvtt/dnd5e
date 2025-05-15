import Item5e from "../../documents/item.mjs";
import DragDropApplicationMixin from "../mixins/drag-drop-mixin.mjs";
import ItemSheet5e from "./item-sheet.mjs";

/**
 * Items sidebar with added support for item containers.
 */
export default class ItemDirectory5e extends DragDropApplicationMixin(foundry.applications.sidebar.tabs.ItemDirectory) {

  /** @override */
  _allowedDropBehaviors(event, data) {
    const allowed = new Set(["copy"]);
    if ( !data?.uuid ) return allowed;
    const { CompendiumCollection } = foundry.documents.collections;
    const fromCompendium = foundry.utils.parseUuid(data.uuid).collection instanceof CompendiumCollection;
    if ( data.type === "Folder" ) return fromCompendium ? allowed : new Set(["move"]);
    else if ( !fromCompendium ) allowed.add("move");
    return allowed;
  }

  /* -------------------------------------------- */

  /** @override */
  _defaultDropBehavior(event, data) {
    if ( !data?.uuid ) return "copy";
    if ( (data.type !== "Folder") && (data.type !== "Item") ) return "none";
    const collection = foundry.utils.parseUuid(data.uuid).collection;
    return ((data.type === "Folder") && (collection instanceof Folder))
      || ((data.type === "Item") && (collection === this.collection)) ? "move" : "copy";
  }

  /* -------------------------------------------- */

  /** @override */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( !data.type ) return;
    const target = event.target.closest(".directory-item") || null;

    // Call the drop handler
    switch ( data.type ) {
      case "Folder":
        return this._handleDroppedFolder(target, data);
      case this.collection.documentName:
        return this._handleDroppedEntry(target, data, event);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleDroppedEntry(target, data, event) {
    // Obtain the dropped Document
    const behavior = this._dropBehavior(event, data);
    let item = await this._getDroppedEntryFromData(data);
    if ( (behavior === "none") || !item ) return;

    // Create item and its contents if it doesn't already exist here
    if ( (behavior === "copy") || !this._entryAlreadyExists(item) ) {
      const toCreate = await Item5e.createWithContents([item]);
      const folder = target?.closest("[data-folder-id]")?.dataset.folderId;
      if ( folder ) toCreate.map(d => d.folder = folder);
      [item] = await Item5e.createDocuments(toCreate, {keepId: true});
      if ( behavior === "move" ) fromUuid(data.uuid).then(d => d?.delete({ deleteContents: true }));
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }

  /* -------------------------------------------- */

  /** @override */
  async _onClickEntry(event, target) {
    const { entryId } = target.closest("[data-entry-id]")?.dataset ?? {};
    const item = this.collection.get(entryId) ?? await this.collection.getDocument(entryId);
    if ( !item ) return super._onClickEntry(event, target);
    const mode = item.sheet?._mode ?? (this.collection.locked ? ItemSheet5e.MODES.PLAY : ItemSheet5e.MODES.EDIT);
    item.sheet.render({ force: true, mode });
  }
}
