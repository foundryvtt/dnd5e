import SystemDataModel from "../../abstract.mjs";

const { BooleanField, SchemaField, StringField, HTMLField } = foundry.data.fields;

/**
 * Data model template for items that can be identified.
 *
 * @property {boolean} identified               Has this item been identified?
 * @property {object} unidentified
 * @property {string} unidentified.name         Name of the item when it is unidentified.
 * @property {string} unidentified.description  Description displayed if item is unidentified.
 * @mixin
 */
export default class IdentifiableTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      identified: new BooleanField({required: true, initial: true, label: "DND5E.Identified"}),
      unidentified: new SchemaField({
        name: new StringField({label: "DND5E.NameUnidentified"}),
        description: new HTMLField({label: "DND5E.DescriptionUnidentified"})
      })
    };
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    IdentifiableTemplate.#migrateUnidentified(source);
  }

  /* -------------------------------------------- */

  /**
   * Move unidentified description into new location.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateUnidentified(source) {
    if ( foundry.utils.hasProperty(source, "description.unidentified")
      && !foundry.utils.getProperty(source, "unidentified.description") ) {
      source.unidentified ??= {};
      source.unidentified.description = source.description.unidentified;
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    const description = this.unidentified.description ?? null;
    Object.defineProperty(this.description, "unidentified", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "Item's unidentified description has moved to `system.unidentified.description`.",
          { since: "DnD5e 3.0", until: "DnD5e 3.2" }
        );
        return description;
      },
      configurable: true
    });
  }
}
