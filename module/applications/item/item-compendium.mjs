import Item5e from "../../documents/item.mjs";
import DragDropApplicationMixin from "../mixins/drag-drop-mixin.mjs";
import ItemSheet5e from "./item-sheet.mjs";

/**
 * Compendium with added support for item containers.
 */
export default class ItemCompendium5e extends DragDropApplicationMixin(foundry.applications.sidebar.apps.Compendium) {

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    let items = this.collection;
    if ( this.collection.index ) {
      if ( !this.collection._reindexing ) this.collection._reindexing = this.collection.getIndex();
      await this.collection._reindexing;
      items = this.collection.index;
    }
    for ( const item of items ) {
      if ( items.has(item.system?.container) ) this.element?.querySelector(`[data-entry-id="${item._id}"]`)?.remove();
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _allowedDropBehaviors(event, data) {
    const allowed = new Set(["copy"]);
    if ( !data?.uuid ) return allowed;
    const s = foundry.utils.parseUuid(data.uuid);
    if ( s.collection === this.collection ) allowed.add("move");
    return allowed;
  }

  /* -------------------------------------------- */

  /** @override */
  _defaultDropBehavior(event, data) {
    if ( !data?.uuid ) return "copy";
    if ( (data.type !== "Folder") && (data.type !== "Item") ) return "none";
    return foundry.utils.parseUuid(data.uuid).collection === this.collection ? "move" : "copy";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _handleDroppedEntry(target, data) {
    // Obtain the dropped Document
    const behavior = this._dropBehavior(event, data);
    let item = await Item.fromDropData(data);
    if ( !item || (behavior === "none") ) return;

    // Create item and its contents if it doesn't already exist here
    if ( (behavior === "copy") || !this._entryAlreadyExists(item) ) {
      const contents = await item.system.contents;
      const toCreate = contents?.size
        ? await Item5e.createWithContents([item], { transformAll: item => item.toCompendium() })
        : [{ ...item.toCompendium(), "system.container": null }];
      if ( toCreate.length ) {
        const folder = target?.closest("[data-folder-id]")?.dataset.folderId;
        if ( folder ) toCreate.map(d => d.folder = folder);
        [item] = await Item5e.createDocuments(toCreate, { pack: this.collection.collection, keepId: true });
      }
    }

    // Otherwise, if it is within a container, take it out
    else if ( item.system.container ) await item.update({"system.container": null});

    // Let parent method perform sorting
    super._handleDroppedEntry(target, item.toDragData());
  }

  /* -------------------------------------------- */

  /** @override */
  async _onClickEntry(event) {
    const { entryId } = event.target.closest("[data-entry-id]")?.dataset ?? {};
    const item = await this.collection.getDocument?.(entryId);
    if ( !item ) return;
    const mode = item.sheet?._mode ?? (this.collection.locked ? ItemSheet5e.MODES.PLAY : ItemSheet5e.MODES.EDIT);
    item.sheet.render(true, { mode });
  }
}
