import SystemDataModel from "../../abstract/system-data-model.mjs";

/**
 * Data model template with item type, subtype and baseItem.
 *
 * @property {object} type                      Standardized item type object.
 * @property {string} type.value                Category to which this item belongs.
 * @property {string} type.subtype              Item subtype according to its category.
 * @property {string} type.baseItem             Item this one is based on.
 * @mixin
 */
export default class ItemTypeTemplate extends SystemDataModel {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Item categories used to populate `system.type.value`.
   * @type {Record<string, string>}
   */
  static get itemCategories() {
    return {};
  }

  get itemCategories() {
    return this.constructor.itemCategories();
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ItemTypeTemplate.#migrateType(source);
  }

  /* -------------------------------------------- */

  /**
   * Convert old types into the new standard.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateType(source) {
    if ( foundry.utils.getType(source.type) === "Object" ) return;
    const oldType = source.consumableType ?? source.armor?.type ?? source.toolType ?? source.weaponType;
    if ( (oldType !== null) && (oldType !== undefined) ) foundry.utils.setProperty(source, "type.value", oldType);
    if ( "baseItem" in source ) foundry.utils.setProperty(source, "type.baseItem", source.baseItem);
  }
}
