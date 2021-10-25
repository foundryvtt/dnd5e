import * as fields from "/common/data/fields.mjs";
import { deepClone, getProperty } from "/common/utils/helpers.mjs";


export function mappingField(options) {
  return {
    type: Object,
    entryType: fields.OBJECT_FIELD,
    required: options.required ?? false,
    nullable: options.nullable ?? true,
    default: options.default || {},
    clean: d => {
      return Object.fromEntries(Object.entries(d).map(([k, e]) => {
        const d = new options.entryType(e);
        return [k, d.toObject(false)];
      }));
    },
    validate: d => {
      if ( !(d instanceof Object) ) return false;
      return Object.values(d).every(e => {
        const d = new options.entryType(e);
        return d.validate();
      });
    },
    validationError: `{name} {field} does not contain valid ${options.entryType.name} entries`
  }
}

export function defaultData(keyPath) {
  return deepClone(getProperty(game.system.template.Actor, keyPath));
}
