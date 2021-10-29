import { deepClone, getProperty } from "/common/utils/helpers.mjs";


export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Actor, keyPath));
}
