const { SetField, StringField } = foundry.data.fields;

/**
 * @import { SizeAdvancementConfigurationData, SizeAdvancementValueData } from "./_types.mjs";
 */

/**
 * Configuration data for the size advancement type.
 * @extends {foundry.abstract.DataModel<SizeAdvancementConfigurationData>}
 * @mixes SizeAdvancementConfigurationData
 */
export class SizeConfigurationData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      sizes: new SetField(new StringField(), { required: false, initial: ["med"], label: "DND5E.Size" })
    };
  }
}

/**
 * Value data for the size advancement type.
 * @extends {foundry.abstract.DataModel<SizeValueData>}
 * @mixes SizeValueData
 */
export class SizeValueData extends foundry.abstract.DataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      size: new StringField({ required: false, label: "DND5E.Size" })
    };
  }
}
