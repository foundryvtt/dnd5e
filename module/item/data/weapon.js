import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


export class ItemWeaponData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.PhysicalItemData.defineSchema(),
      common.ActivatedEffectData.defineSchema(),
      common.ActionData.defineSchema(),
      common.MountableData.defineSchema(),
      {
        weaponType: fields.field(fields.REQUIRED_STRING, { default: defaultData("weapon.weaponType") }),
        baseItem: fields.BLANK_STRING,
        properties: fields.OBJECT_FIELD,
        proficient: fields.field(fields.BOOLEAN_FIELD, { default: defaultData("weapon.proficient") })
      }
    );
  }
}
