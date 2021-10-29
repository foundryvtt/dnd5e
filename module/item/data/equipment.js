import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { NONNEGATIVE_NUMBER_FIELD } from "../../fields.js";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


export class ItemEquipmentData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema(),
      common.ActivatedEffectData.defineSchema(),
      common.ActionData.defineSchema(),
      common.MountableData.defineSchema(),
      {
        armor: {
          type: ArmorData,
          required: true,
          nullable: false,
          default: defaultData("equipment.armor")
        },
        baseItem: fields.BLANK_STRING,
        speed: {
          type: SpeedData,
          required: true,
          nullable: false,
          default: defaultData("equipment.speed")
        },
        strength: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, fields.REQUIRED_NUMBER),
        stealth: fields.BOOLEAN_FIELD,
        proficient: fields.field(fields.BOOLEAN_FIELD, { default: true })
      }
    );
  }
}

/**
 * An embedded data structure for equipment armor class and related properties.
 * @extends DocumentData
 * @see ItemEquipmentData
 *
 * @property {string} type   Equipment type as defined in `DND5E.equipmentTypes`.
 * @property {number} value  Base armor class or shield bonus.
 * @property {number} dex    Maximum dex bonus added to armor class.
 */
class ArmorData extends DocumentData {
  static defineSchema() {
    return {
      type: fields.field(fields.REQUIRED_STRING, { default: defaultData("equipment.armor.type") }),
      value: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, { default: null }),
      dex: fields.field(fields.INTEGER_FIELD, { default: null })
    };
  }
}

/**
 * An embedded data structure for vehicle equipment's speed.
 * @extends DocumentData
 * @see ItemEquipmentData
 *
 * @property {number} value       Speed granted by this piece of equipment in feet or meters depending on system setting.
 * @property {string} conditions  Conditions that may affect item's speed.
 */
class SpeedData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.field(NONNEGATIVE_NUMBER_FIELD, { default: null }),
      conditions: fields.BLANK_STRING
    };
  }
}
