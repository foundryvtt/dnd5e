/**
 * A field for storing Item type data.
 */
export default class ItemTypeField extends foundry.data.fields.SchemaField {
  /**
   * @param {object} [options]                  Options to configure this field's behavior.
   * @param {string} [options.value=""]         An initial value for the Item's type.
   * @param {string} [options.subtype=""]       An initial value for the Item's subtype.
   * @param {string} [options.baseItem=""]      An initial value for the Item's baseItem.
   * @param {DataFieldOptions} [schemaOptions]  Options forwarded to the SchemaField.
   */
  constructor({ value="", subtype="", baseItem="" }={}, schemaOptions={}) {
    super({
      value: new foundry.data.fields.StringField({
        required: true, blank: true, initial: value ?? "", label: "DND5E.Type"
      }),
      subtype: new foundry.data.fields.StringField({
        required: true, blank: true, initial: subtype ?? "", label: "DND5E.Subtype"
      }),
      baseItem: new foundry.data.fields.StringField({
        required: true, blank: true, initial: baseItem ?? "", label: "DND5E.BaseItem"
      })
    }, schemaOptions);
  }
};
