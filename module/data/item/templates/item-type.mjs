import SystemDataModel from "../../abstract.mjs";

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
  /** @inheritdoc */
  static defineSchema() {
    return {
      type: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.Type"}),
        subtype: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.Subtype"}),
        baseItem: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.BaseItem"})
      })
    };
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
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
    if ( !source.type ) source.type = { value: "", subtype: "", baseItem: "" };
    const oldType = source.consumableType ?? source.armor?.type ?? source.toolType ?? source.weaponType;
    if ( ![undefined, null].includes(oldType) ) source.type.value = oldType;
    const oldBase = source.baseItem;
    if ( ![undefined, null].includes(oldBase) ) source.type.baseItem = oldBase;
  }
}
