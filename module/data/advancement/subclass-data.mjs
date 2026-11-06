import LocalDocumentField from "../fields/local-document-field.mjs";

const { BooleanField, DocumentUUIDField, SchemaField } = foundry.data.fields;

/**
 * @import { SubclassAdvancementValueData } from "./_types.mjs";
 */

/**
 * Configuration data for the subclass advancement type.
 * @extends {foundry.abstract.DataModel<SubclassAdvancementConfigurationData>}
 * @mixes SubclassAdvancementConfigurationData
 */
export class SubclassConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      suggested: new SchemaField({
        fixed: new BooleanField(),
        uuid: new DocumentUUIDField({ embedded: false, type: "Item" })
      }, { required: false })
    };
  }
}

/**
 * Value data for Subclass advancement.
 * @extends {foundry.abstract.DataModel<SubclassAdvancementValueData>}
 * @mixes SubclassAdvancementValueData
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
