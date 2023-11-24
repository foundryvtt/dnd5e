import Item5e from "../../documents/item.mjs";

/**
 * Patch some CompendiumCollection methods for container handling.
 */
export function patchCompendiumCollection() {
  const proto = CompendiumCollection.prototype;

  proto._originalImportDocument = proto.importDocument;
  proto.importDocument = importDocument;

  proto._originalGetVisibleTreeContents = proto._getVisibleTreeContents;
  proto._getVisibleTreeContents = _getVisibleTreeContents;
}

/* -------------------------------------------- */

/**
 * Import a Document into this Compendium Collection, including any contained items.
 * @param {Document} document     The existing Document you wish to import
 * @param {object} [options]      Additional options which modify how the data is imported.
 *                                See {@link ClientDocumentMixin#toCompendium}
 * @returns {Promise<Document>}   The imported Document instance
 */
async function importDocument(document, options={}) {
  const created = await this._originalImportDocument(document, options);

  // Handle importing any contents
  const contents = await document.system.contents;
  if ( contents ) {
    const toCreate = await Item5e.createWithContents(contents, {
      container: created, keepId: options.keepId, transformAll: item => item.toCompendium(item, options)
    });
    await Item5e.createDocuments(toCreate, {pack: this.collection, keepId: true});
  }

  return created;
}

/* -------------------------------------------- */

/**
 * Return a reference to list of entries which are visible to the User in this tree.
 * @returns {Array<*>}
 * @private
 */
function _getVisibleTreeContents() {
  return this.index.contents.filter(c => !this.index.has(c.system?.container));
}
