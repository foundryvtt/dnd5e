/**
 * Data model template with item type, subtype and baseItem.
 *
 * @property {object} type                      Standardized item type object.
 * @property {string} type.value                Item type.
 * @property {string} type.subtype              Item subtype.
 * @property {string} type.baseItem             Item this is based on.
 * @mixin
 */
export default class ItemTypeTemplate extends foundry.abstract.DataModel {
    /** @inheritdoc */
    static defineSchema() {
      return {
        type: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.StringField({required: true, label: "DND5E.Type"}),
          subtype: new foundry.data.fields.StringField({required: true, label: "DND5E.Subttype"}),
          baseItem: new foundry.data.fields.StringField({required: true, label: "DND5E.BaseItem"})
        })
      };
    }
  
    /* -------------------------------------------- */
    /*  Migrations                                  */
    /* -------------------------------------------- */
  
    /** @inheritdoc */
    static migrateData(source) {
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
      if ( oldType !== undefined ) source.type.value = oldType;
      const oldBase = source.baseItem;
      if ( oldBase !== undefined ) source.type.baseItem = oldType;
    }
  }
  