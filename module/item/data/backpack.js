import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { NONNEGATIVE_NUMBER_FIELD } from "../../fields.js";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";
import { CurrencyData } from "../../actor/data/common.js";


/**
 * Data definition for Backpack items.
 * @extends DocumentData
 * @see common.ItemDescriptionData
 * @see common.PhysicalItemData
 *
 * @property {CapacityData} capacity  Information on container's carrying capacity.
 * @property {CurrencyData} currency  Amount of currency currently held by the container.
 */
export class ItemBackpackData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema(),
      {
        capacity: {
          type: CapacityData,
          required: true,
          nullable: false,
          default: defaultData("backpack.capacity")
        },
        currency: {
          type: CurrencyData,
          required: true,
          nullable: false,
          default: defaultData("backpack.currency")
        }
      }
    );
  }
}

/**
 * An embedded data structure for tracking container carrying capacity.
 * @extends DocumentData
 * @see ItemBackpackData
 *
 * @property {string} type         Method for tracking maximum capacity as defined in `DND5E.itemCapacityTypes`.
 * @property {number} value        Total amount of the type this container can carry.
 * @property {boolean} weightless  Does the weight of the items in the container carry over to the actor?
 */
class CapacityData extends DocumentData {
  static defineSchema() {
    return {
      type: fields.field(fields.REQUIRED_STRING, { default: defaultData("backpack.capacity.type") }),
      value: fields.field(NONNEGATIVE_NUMBER_FIELD, fields.REQUIRED_NUMBER),
      weightless: fields.BOOLEAN_FIELD
    };
  }
}
