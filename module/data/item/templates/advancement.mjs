import SystemDataModel from "../../abstract/system-data-model.mjs";
import AdvancementCollectionField from "../../fields/advancement-collection-field.mjs";

const { ArrayField } = foundry.data.fields;

/**
 * @import { AdvancementTemplateData } from "./_types.mjs";
 */

/**
 * Data model template for items with advancement.
 * @extends {SystemDataModel<AdvancementTemplateData>}
 * @mixin
 */
export default class AdvancementTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      advancement: new AdvancementCollectionField({ label: "DND5E.AdvancementTitle" })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /**
   * Migrate advancement data.
   * @param {object} source  Candidate source data to migrate.
   */
  static migrateAdvancement(source) {
    AdvancementTemplate.#migrateStorage(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate advancement data to be stored in an object, not an array.
   * @param {object} source  Candidate source data to migrate.
   */
  static #migrateStorage(source) {
    if ( foundry.utils.getType(source.advancement) === "Array" ) {
      source.advancement = source.advancement.reduce((obj, advancement) => {
        obj[advancement._id] = advancement;
        return obj;
      }, {});
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * If no advancement data exists on the item, create some default advancement.
   * @param {object} data     The initial data object provided to the document creation request.
   * @param {object} options  Additional options which modify the creation request.
   */
  async preCreateAdvancement(data, options) {
    if ( data._id || foundry.utils.hasProperty(data, "system.advancement") ) return;
    const toCreate = this._advancementToCreate(options);
    if ( toCreate.length ) this.parent.updateSource({
      "system.advancement": toCreate.reduce((obj, c) => {
        const baseData = foundry.utils.deepClone(c);
        const config = CONFIG.DND5E.advancementTypes[c.type];
        const cls = config.documentClass ?? config;
        const advancement = new cls(c, { parent: this.parent });
        if ( advancement._preCreate(baseData) === false ) return obj;
        obj[advancement.id] = advancement.toObject();
        return obj;
      })
    });
  }

  /* -------------------------------------------- */

  /**
   * Create a list of advancement data to be created on new items of this type.
   * @param {object} options  Additional options which modify the creation request.
   * @returns {object[]}
   * @protected
   */
  _advancementToCreate(options) {
    return [];
  }
}
