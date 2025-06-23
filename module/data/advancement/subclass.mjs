import LocalDocumentField from "../fields/local-document-field.mjs";

const { DocumentUUIDField } = foundry.data.fields;

/**
 * Value data for Subclass advancement.
 * @property {Item5e} document  Copy of the subclass on the actor.
 * @property {string} uuid      UUID of the remote subclass source.
 */
export class SubclassValueData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      document: new LocalDocumentField(foundry.documents.BaseItem),
      uuid: new DocumentUUIDField({ type: "Item" })
    };
  }
}
