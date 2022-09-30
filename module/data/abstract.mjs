/**
 * Data Model variant with some extra methods to support template mix-ins.
 */
export default class SystemDataModel extends foundry.abstract.DataModel {

  /**
   * Name of the base templates used for construction.
   * @type {string[]}
   */
  static _templates;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    let schema = {};
    this._templates?.forEach(t => schema = { ...schema, ...this[`${t}_systemSchema`]() });
    return { ...schema, ...this.systemSchema() };
  }

  /* -------------------------------------------- */

  /**
   * Specific schema that will be merged with template schema.
   * @returns {object}
   */
  static systemSchema() {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Helper methods to get all enumerable methods, inherited or own, for the provided object.
   * @param {object} object          Source of the methods to fetch.
   * @param {string} [startingWith]  Optional filtering string.
   * @returns {string[]}             Array of method keys.
   */
  static _getMethods(object, startingWith) {
    let keys = [];
    for ( const key in object ) { keys.push(key); }
    keys.push(...Object.getOwnPropertyNames(object));
    if ( startingWith ) keys = keys.filter(key => key.startsWith(startingWith));
    return keys;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this._getMethods(this, "migrate").forEach(k => this[k](source));
    return super.migrateData(source);
  }

  /* -------------------------------------------- */

  /**
   * Mix multiple templates with the base type.
   * @param {...*} templates     Template classes to mix.
   * @returns {SystemDataModel}  Final prepared type.
   */
  static mixin(...templates) {
    const Base = class extends this {};

    Base._templates = [];
    Base._migrations = [];
    for ( const template of templates ) {
      Base._templates.push(template.name);
      for ( const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template)) ) {
        if ( ["length", "migrateData", "mixed", "name", "prototype"].includes(key) ) continue;
        if ( key === "systemSchema" ) {
          Object.defineProperty(Base, `${template.name}_systemSchema`, descriptor);
          continue;
        }
        Object.defineProperty(Base, key, {...descriptor, enumerable: true});
      }
      for ( const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template.prototype)) ) {
        if ( ["constructor"].includes(key) ) continue;
        Object.defineProperty(Base.prototype, key, {...descriptor, enumerable: true});
      }
    }

    return Base;
  }
}
