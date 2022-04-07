import { DocumentData } from "/common/abstract/module.mjs";
import { mergeObject } from "/common/utils/helpers.mjs";
import * as common from "./common.js";


/**
 * Data definition for Loot items.
 * @extends DocumentData
 * @see common.ItemDescriptionData
 * @see common.PhysicalItemData
 */
export class ItemLootData extends DocumentData {
  static defineSchema() {
    return mergeObject(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema()
    );
  }
}
