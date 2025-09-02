import SystemDataModel from "../../abstract/system-data-model.mjs";
import AdvancementField from "../../fields/advancement-field.mjs";

const { ArrayField } = foundry.data.fields;

/**
 * Data model template for items with advancement.
 *
 * @property {Advancement[]} advancement  Advancement objects for this item.
 * @mixin
 */
export default class AdvancementTemplate extends SystemDataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      advancement: new ArrayField(new AdvancementField(), { label: "DND5E.AdvancementTitle" })
    };
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
      "system.advancement": toCreate.map(c => {
        const config = CONFIG.DND5E.advancementTypes[c.type];
        const cls = config.documentClass ?? config;
        return new cls(c, { parent: this.parent }).toObject();
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
