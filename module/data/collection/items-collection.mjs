import Item5e from "../../documents/item.mjs";

/**
 * Custom items collection to hide items in containers automatically.
 */
export default class Items5e extends Items {
  /** @override */
  _getVisibleTreeContents(entry) {
    return this.contents.filter(c => c.visible && !this.has(c.system?.container));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async importFromCompendium(pack, id, updateData={}, options={}) {
    const created = await super.importFromCompendium(pack, id, updateData, options);

    const item = await pack.getDocument(id);
    const contents = await item.system.contents;
    if ( contents ) {
      const toCreate = await Item5e.createWithContents(contents, {container: created});
      await Item5e.createDocuments(toCreate, {fromCompendium: true, keepId: true});
    }

    return created;
  }
}
