import SystemDataModel from "../../abstract.mjs";
import SourceField from "../../shared/source-field.mjs";

const { SchemaField, HTMLField } = foundry.data.fields;

/**
 * Data model template with item description & source.
 *
 * @property {object} description               Various item descriptions.
 * @property {string} description.value         Full item description.
 * @property {string} description.chat          Description displayed in chat card.
 * @property {SourceField} source               Adventure or sourcebook where this item originated.
 * @mixin
 */
export default class ItemDescriptionTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({required: true, nullable: true, label: "DND5E.Description"}),
        chat: new HTMLField({required: true, nullable: true, label: "DND5E.DescriptionChat"})
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
