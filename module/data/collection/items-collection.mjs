import Item5e from "../../documents/item.mjs";

/**
 * Custom items collection to hide items in containers automatically.
 */
export default class Items5e extends foundry.documents.collections.Items {
  /** @override */
  _getVisibleTreeContents(entry) {
    return this.contents.filter(c => c.visible && !this.has(c.system?.container));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async importFromCompendium(pack, id, updateData={}, options={}) {
    const created = await super.importFromCompendium(pack, id, updateData, options);

    const item = await pack.getDocument(id);
    const contents = await item.system.contents;
    if ( contents ) {
      const fromOptions = foundry.utils.mergeObject({ clearSort: false }, options);
      const toCreate = await Item5e.createWithContents(contents, {
        container: created, keepId: options.keepId, transformAll: item => this.fromCompendium(item, fromOptions)
      });
      await Item5e.createDocuments(toCreate, {fromCompendium: true, keepId: true});
    }

    return created;
  }
}
