import SystemDataModel from "../../abstract.mjs";

/**
 * Data model template with item description & source.
 *
 * @property {object} description               Various item descriptions.
 * @property {string} description.value         Full item description.
 * @property {string} description.chat          Description displayed in chat card.
 * @property {string} description.unidentified  Description displayed if item is unidentified.
 * @property {string} source                    Adventure or sourcebook where this item originated.
 */
export default class ItemDescriptionTemplate extends SystemDataModel {
  static systemSchema() {
    return {
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({required: true, label: "DND5E.Description"}),
        chat: new foundry.data.fields.HTMLField({required: true, label: "DND5E.DescriptionChat"}),
        unidentified: new foundry.data.fields.HTMLField({required: true, label: "DND5E.DescriptionUnidentified"})
      }),
      source: new foundry.data.fields.StringField({required: true, label: "DND5E.Source"})
    };
  }
}
