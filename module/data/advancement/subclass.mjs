import LocalDocumentField from "../fields/local-document-field.mjs";

const { DocumentUUIDField } = foundry.data.fields;

/**
 * @import { SubclassValueData } from "./_types.mjs";
 */

/**
 * Value data for Subclass advancement.
 * @extends DataModel<SubclassValueData>
 * @mixes SubclassValueData
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
