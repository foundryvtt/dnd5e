import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


export class ItemConsumableData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema(),
      common.ActivatedEffectData.defineSchema(),
      common.ActionData.defineSchema(),
      {
        consumableType: fields.field(fields.REQUIRED_STRING, { default: defaultData("consumable.consumableType") }),
        uses: { type: UsesData }
      }
    );
  }
}

/**
 * An embedded data structure for 
 * @extends common.UsesData
 * @see ItemConsumableData
 *
 * @property {boolean} autoDestroy  Should this item be destroyed when it runs out of uses. 
 */
class UsesData extends common.UsesData {
  static defineSchema() {
    return mergeObjects(super.defineSchema(), {
      autoDestroy: fields.BOOLEAN_FIELD
    });
  }
}
