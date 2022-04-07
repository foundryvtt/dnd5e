import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


/**
 * Data definition for Feature items.
 * @extends DocumentData
 * @see common.ItemDescriptionData
 * @see common.ActivatedEffectData
 * @see common.ActionData
 *
 * @property {string} requirements    Actor details required to use this feature.
 * @property {RechargeData} recharge  Details on how a feature can roll for recharges.
 */
export class ItemFeatData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.ActivatedEffectData.defineSchema(),
      common.ActionData.defineSchema(),
      {
        requirements: fields.BLANK_STRING,
        recharge: {
          type: RechargeData,
          required: true,
          nullable: false,
          default: defaultData("feat.recharge")
        }
      }
    );
  }
}

/**
 * An embedded data structure for feature charges.
 * @extends DocumentData
 * @see ItemFeatData
 *
 * @property {number} value     Minimum number needed to roll on a d6 to recharge this feature.
 * @property {boolean} charged  Does this feature have a charge remaining?
 */
class RechargeData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(fields.POSITIVE_INTEGER_FIELD, { default: null }),
      charged: fields.BOOLEAN_FIELD
    };
  }
}
