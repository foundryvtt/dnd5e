import SystemDataModel from "../../abstract.mjs";
import SourceField from "../../shared/source-field.mjs";

/**
 * Data model template with item description & source.
 *
 * @property {object} description               Various item descriptions.
 * @property {string} description.value         Full item description.
 * @property {string} description.chat          Description displayed in chat card.
 * @property {string} description.unidentified  Description displayed if item is unidentified.
 * @property {SourceField} source               Adventure or sourcebook where this item originated.
 * @mixin
 */
export default class ItemDescriptionTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({required: true, nullable: true, label: "DND5E.Description"}),
        chat: new foundry.data.fields.HTMLField({required: true, nullable: true, label: "DND5E.DescriptionChat"}),
        unidentified: new foundry.data.fields.HTMLField({
          required: true, nullable: true, label: "DND5E.DescriptionUnidentified"
        })
      }),
      source: new SourceField()
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ItemDescriptionTemplate.#migrateSource(source);
  }

  /* -------------------------------------------- */

  /**
   * Convert source string into custom object.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateSource(source) {
    if ( ("source" in source) && (foundry.utils.getType(source.source) !== "Object") ) {
      source.source = { custom: source.source };
    }
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * What properties can be used for this item?
   * @returns {Set<string>}
   */
  get validProperties() {
    return new Set(CONFIG.DND5E.validProperties[this.parent.type] ?? []);
  }
}
