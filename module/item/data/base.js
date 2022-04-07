import { deepClone, getProperty } from "/common/utils/helpers.mjs";


/**
 * Retrieve the default value for Items as defined in `template.json`.
 * @param {string} keyPath  Path to the desired data structure.
 * @returns {*}             Default data retrieved.
 */
export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Item, keyPath));
}

/**
 * Merge any number of objects into a single object.
 * @param {...object} objects  Objects to be merged.
 * @returns {object}           Result of the merge.
 */
export function mergeObjects(objects) {
  return Array.from(arguments).reduce((acc, other) => mergeObject(acc, other), {});
}
