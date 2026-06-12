import IdentifierField from "../fields/identifier-field.mjs";

const { ArrayField, DocumentIdField, DocumentUUIDField, SchemaField, SetField } = foundry.data.fields;

/**
 * @import { ModifyItemAdvancementConfigurationData, ModifyItemAdvancementValueData } from "./_types.mjs";
 */

/**
 * Configuration data for the Modify Item advancement.
 * @extends {foundry.abstract.DataModel<ModifyItemAdvancementConfigurationData>}
 * @mixes ModifyItemAdvancementConfigurationData
 */
export class ModifyItemConfigurationData extends foundry.abstract.DataModel {
  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.ModifyItem"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      changes: new ArrayField(new SchemaField({
        _id: new DocumentIdField(),
        uuid: new DocumentUUIDField(),
        identifiers: new SetField(new IdentifierField({ allowType: true }))
      }))
    };
  }
}

/* -------------------------------------------- */

/**
 * Value data for the Modify Item advancement.
 * @extends {foundry.abstract.DataModel<ModifyItemAdvancementValueData>}
 * @mixes ModifyItemAdvancementValueData
 */
export class ModifyItemValueData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      modified: new ArrayField(new SchemaField({
        change: new DocumentIdField(),
        effect: new DocumentIdField(),
        item: new DocumentIdField()
      }))
    };
  }
}
