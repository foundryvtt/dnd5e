import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { NONNEGATIVE_NUMBER_FIELD } from "../../fields.js";
import { defaultData, mergeObjects } from "./base.js";
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
        proficient: fields.field(NONNEGATIVE_NUMBER_FIELD, fields.REQUIRED_NUMBER),
        bonus: fields.BLANK_STRING
      }
    );
  }
}
