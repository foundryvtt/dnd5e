import { deepClone, getProperty } from "/common/utils/helpers.mjs";


export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Item, keyPath));
}

export function mergeObjects(objects) {
  return Array.from(arguments).reduce((acc, other) => mergeObject(acc, other), {});
}

export const NONNEGATIVE_NUMBER_FIELD = {
  type: Number,
  required: false,
  validate: n => Number.isFinite(n) && (n >= 0),
  validationError: '{name} {field} "{value}" does not have an non-negative value'
};

export const NULLABLE_STRING = {
  type: String,
  required: true,
  nullable: true,
  clean: v => v ? String(v).trim() : null,
  default: null
};
