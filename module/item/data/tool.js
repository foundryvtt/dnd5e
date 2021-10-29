import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, mergeObjects, NONNEGATIVE_NUMBER_FIELD } from "./base.js";
import * as common from "./common.js";


export class ItemToolData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema(),
      {
        toolType: fields.BLANK_STRING,
        baseItem: fields.BLANK_STRING,
        ability: fields.field(fields.REQUIRED_STRING, { default: defaultData("tool.ability") }),
        chatFlavor: fields.BLANK_STRING,
        proficient: fields.field(fields.NONNEGATIVE_NUMBER_FIELD, fields.REQUIRED_NUMBER),
        bonus: fields.BLANK_STRING
      }
    );
  }
}
