/**
 * FIXME: Remove when v12 support dropped or https://github.com/foundryvtt/foundryvtt/issues/11991 backported.
 * Should NOT be exported for general use.
 * @ignore
 */
export default function parseUuid(uuid, {relative}={}) {
  if ( game.release.generation > 12 ) return foundry.utils.parseUuid(uuid, { relative });
  if ( !uuid ) throw new Error("A UUID string is required.");
  if ( uuid.startsWith(".") && relative ) return _resolveRelativeUuid(uuid, relative);
  const parsed = foundry.utils.parseUuid(uuid, {relative});
  if ( !parsed?.collection ) return parsed;
  const remappedUuid = uuid.startsWith("Compendium") ? [
    "Compendium",
    parsed.collection.metadata.id,
    parsed.primaryType ?? parsed.documentType,
    parsed.primaryId ?? parsed.documentId,
    ...parsed.embedded
  ].join(".") : uuid;
  return { ...parsed, uuid: remappedUuid };
}

/** @ignore */
function _resolveRelativeUuid(uuid, relative) {
  if ( !(relative instanceof foundry.abstract.Document) ) {
    throw new Error("A relative Document instance must be provided to _resolveRelativeUuid");
  }
  uuid = uuid.substring(1);
  const parts = uuid.split(".");
  if ( !parts.length ) throw new Error("Invalid relative UUID");
  let id;
  let type;
  let root;
  let primaryType;
  let primaryId;
  let collection;

  // Identify the root document and its collection
  const getRoot = doc => {
    if ( doc.parent ) parts.unshift(doc.documentName, doc.id);
    return doc.parent ? getRoot(doc.parent) : doc;
  };

  // Even-numbered parts include an explicit child document type
  if ( (parts.length % 2) === 0 ) {
    root = getRoot(relative);
    id = parts.at(-1);
    type = parts.at(-2);
    primaryType = root.documentName;
    primaryId = root.id;
    uuid = [primaryType, primaryId, ...parts].join(".");
  }

  // Relative Embedded Document
  else if ( relative.parent ) {
    id = parts.at(-1);
    type = relative.documentName;
    parts.unshift(type);
    root = getRoot(relative.parent);
    primaryType = root.documentName;
    primaryId = root.id;
    uuid = [primaryType, primaryId, ...parts].join(".");
  }

  // Relative Document
  else {
    root = relative;
    id = parts.pop();
    type = relative.documentName;
    uuid = [type, id].join(".");
  }

  // Recreate fully-qualified UUID and return the resolved result
  collection = root.pack ? root.compendium : root.collection;
  if ( root.pack ) uuid = `Compendium.${root.pack}.${uuid}`;
  return {uuid, type, id, collection, primaryType, primaryId, embedded: parts,
    documentType: primaryType ?? type, documentId: primaryId ?? id};
}
