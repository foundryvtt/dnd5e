import { deepClone, getProperty } from "/common/utils/helpers.mjs";


/**
 * Retrieve the default value for Actors as defined in `template.json`.
 * @param {string} keyPath  Path to the desired data structure.
 * @returns {*}             Default data retrieved.
 */
export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Actor, keyPath));
}
