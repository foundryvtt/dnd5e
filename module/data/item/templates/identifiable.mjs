import * as Trait from "../../../documents/actor/trait.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";

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
  /** @inheritDoc */
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

  /** @inheritDoc */
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

  /**
   * Prepare the unidentified name for the item.
   */
  prepareIdentifiable() {
    if ( !this.identified && this.unidentified.name ) {
      this.parent.name = this.unidentified.name;
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * If no unidentified name or description are set when the identified checkbox is unchecked, then fetch values
   * from base item if possible.
   * @param {object} changed            The differential data that is changed relative to the document's prior values.
   * @param {object} options            Additional options which modify the update request
   * @param {documents.BaseUser} user   The User requesting the document update
   * @returns {Promise<boolean|void>}   A return value of false indicates the update operation should be cancelled.
   * @see {Document#_preUpdate}
   * @protected
   */
  async preUpdateIdentifiable(changed, options, user) {
    if ( !foundry.utils.hasProperty(changed, "system.identified") || changed.system.identified ) return;

    const fetchName = !foundry.utils.getProperty(changed, "system.unidentified.name") && !this.unidentified.name;
    const fetchDesc = !foundry.utils.getProperty(changed, "system.unidentified.description")
      && !this.unidentified.description;
    if ( !fetchName && !fetchDesc ) return;

    const baseItem = await Trait.getBaseItem(this.type?.identifier ?? "", { fullItem: fetchDesc });

    // If a base item is set, fetch that and use its name/description
    if ( baseItem ) {
      if ( fetchName ) {
        foundry.utils.setProperty(changed, "system.unidentified.name", game.i18n.format(
          "DND5E.Unidentified.DefaultName", { name: baseItem.name }
        ));
      }
      if ( fetchDesc ) {
        foundry.utils.setProperty(changed, "system.unidentified.description", baseItem.system.description.value);
      }
      return;
    }

    // Otherwise, set the name to match the item type
    if ( fetchName ) foundry.utils.setProperty(changed, "system.unidentified.name", game.i18n.format(
      "DND5E.Unidentified.DefaultName", { name: game.i18n.localize(CONFIG.Item.typeLabels[this.parent.type]) }
    ));
  }
}
