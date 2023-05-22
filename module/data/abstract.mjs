/**
 * Data Model variant with some extra methods to support template mix-ins.
 *
 * **Note**: This uses some advanced Javascript techniques that are not necessary for most data models.
 * Please refer to the [advancement data models]{@link BaseAdvancement} for an example of a more typical usage.
 *
 * In template.json, each Actor or Item type can incorporate several templates which are chunks of data that are
 * common across all the types that use them. One way to represent them in the schema for a given Document type is to
 * duplicate schema definitions for the templates and write them directly into the Data Model for the Document type.
 * This works fine for small templates or systems that do not need many Document types but for more complex systems
 * this boilerplate can become prohibitive.
 *
 * Here we have opted to instead create a separate Data Model for each template available. These define their own
 * schemas which are then mixed-in to the final schema for the Document type's Data Model. A Document type Data Model
 * can define its own schema unique to it, and then add templates in direct correspondence to those in template.json
 * via SystemDataModel.mixin.
 */
export default class SystemDataModel extends foundry.abstract.DataModel {

  /** @inheritdoc */
  static _enableV10Validation = true;

  /**
   * System type that this system data model represents (e.g. "character", "npc", "vehicle").
   * @type {string}
   */
  static _systemType;

  /* -------------------------------------------- */

  /**
   * Base templates used for construction.
   * @type {*[]}
   * @private
   */
  static _schemaTemplates = [];

  /* -------------------------------------------- */

  /**
   * A list of properties that should not be mixed-in to the final type.
   * @type {Set<string>}
   * @private
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
      this.mergeSchema(schema, template.defineSchema());
    }
    return schema;
  }

  /* -------------------------------------------- */

  /**
   * Merge two schema definitions together as well as possible.
   * @param {DataSchema} a  First schema that forms the basis for the merge. *Will be mutated.*
   * @param {DataSchema} b  Second schema that will be merged in, overwriting any non-mergeable properties.
   * @returns {DataSchema}  Fully merged schema.
   */
  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
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

  /** @inheritdoc */
  validate(options={}) {
    if ( this.constructor._enableV10Validation === false ) return true;
    return super.validate(options);
  }

  /* -------------------------------------------- */

  /**
   * Mix multiple templates with the base type.
   * @param {...*} templates            Template classes to mix.
   * @returns {typeof SystemDataModel}  Final prepared type.
   */
  static mixin(...templates) {
    const Base = class extends this {};
    Object.defineProperty(Base, "_schemaTemplates", {
      value: Object.seal([...this._schemaTemplates, ...templates]),
      writable: false,
      configurable: false
    });

    for ( const template of templates ) {
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
