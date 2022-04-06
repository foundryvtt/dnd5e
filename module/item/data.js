export { ItemWeaponData } from "./data/weapon.js";

import { deepClone, diffObject } from "/common/utils/helpers.mjs";


/**
 * Method for checking to ensure data definition properly matches document data.
 * @param {Document} document         Document to use for comparison.
 * @param {DocumentData} definition   Data definition to compare against.
 * @param {boolean} compareToDefault  Compare document against defaults.
 * @returns {object}                  Differences between original document data and parsed data.
 */
export function _checkData(document, definition, compareToDefault=false) {
  const otherData = compareToDefault ? {} : deepClone(document.data._source.data);
  return diffObject(document.data._source.data, (new definition(otherData)).toObject(false));
}
