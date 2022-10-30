import PhysicalItemTemplate from "../item/templates/physical-item.mjs";

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
  const depth = options._containerDepth ?? 0;
  const contents = await document.system?.contents;
  if ( contents && (depth < PhysicalItemTemplate.MAX_DEPTH) ) {
    const contentsOptions = foundry.utils.mergeObject(options, {
      setContainerId: created.id,
      _containerDepth: depth + 1
    }, {implace: false});
    for ( const doc of contents ) await this.importDocument(doc, contentsOptions);
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
