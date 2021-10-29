import { deepClone, getProperty } from "/common/utils/helpers.mjs";


export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Item, keyPath));
}

export function mergeObjects(objects) {
  return Array.from(arguments).reduce((acc, other) => mergeObject(acc, other), {});
}
