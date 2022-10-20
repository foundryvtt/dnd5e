/**
 * Data Model variant with some extra methods to support template mix-ins.
 */
export default class SystemDataModel extends foundry.abstract.DataModel {

  /**
   * Base templates used for construction.
   * @type {*[]}
   * @protected
   */
  static _schemaTemplates = [];

  /* -------------------------------------------- */

  /**
   * A list of properties that should not be mixed-in to the final type.
   * @type {string[]}
   * @protected
   */
  static _immiscible = new Set(["length", "mixed", "name", "prototype", "migrateData", "defineSchema"]);

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const schema = {};
    for ( const template of this._schemaTemplates ) {
      if ( !template.defineSchema ) {
        throw new Error(`Invalid dnd5e template mixin ${template} defined on class ${this.constructor}`);
      }
      Object.assign(schema, template.defineSchema());
    }
    return schema;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    for ( const template of this._schemaTemplates ) {
      template.migrateData?.(source);
    }
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
    Base._schemaTemplates = [];

    for ( const template of templates ) {
      Base._schemaTemplates.push(template);

      // Take all static methods and fields from template and mix in to base class
      for ( const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template)) ) {
        if ( this._immiscible.has(key) ) continue;
        Object.defineProperty(Base, key, descriptor);
      }

      // Take all instance methods and fields from template and mix in to base class
      for ( const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(template.prototype)) ) {
        if ( ["constructor"].includes(key) ) continue;
        Object.defineProperty(Base.prototype, key, descriptor);
      }
    }

    return Base;
  }
}
