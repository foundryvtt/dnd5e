export { ItemBackpackData } from "./data/backpack.js";
export { ItemClassData } from "./data/class.js";
export { ItemConsumableData } from "./data/consumable.js";
export { ItemEquipmentData } from "./data/equipment.js";
export { ItemFeatData } from "./data/feat.js";
export { ItemLootData } from "./data/loot.js";
export { ItemSpellData } from "./data/spell.js";
export { ItemToolData } from "./data/tool.js";
export { ItemWeaponData } from "./data/weapon.js";

import { deepClone, diffObject } from "/common/utils/helpers.mjs";


/**
 * Method for checking to ensure data definition properly matches document data.
 * @property {Document} document         Document to use for comparison.
 * @property {DocumentData} definition   Data definition to compare against.
 * @property {boolean} compareToDefault  Compare document against defaults.
 */
export function _checkData(document, definition, compareToDefault=false) {
  const otherData = compareToDefault ? {} : deepClone(document.data._source.data);
  return diffObject(document.data._source.data, (new definition(otherData)).toObject(false));
}
