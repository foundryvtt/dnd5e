/**
 * A field for storing Item type data.
 *
 * @param {object} [defaults={}]                   Options to configure this field's behavior.
 * @param {string} [defaults.value]                An initial value for the Item's type.
 * @param {string} [defaults.subtype]              An initial value for the Item's subtype.
 * @param {string} [defaults.baseItem]             An initial value for the Item's baseItem.
 * @param {DataFieldOptions} [schemaOptions]       Options forwarded to the SchemaField.
 * @param {boolean} [schemaOptions.subtype=true]   Include the subtype field.
 * @param {boolean} [schemaOptions.baseItem=true]  Include the baseItem field.
 */
export default class ItemTypeField extends foundry.data.fields.SchemaField {
  constructor(defaults={}, { subtype=true, baseItem=true, ...schemaOptions}={}) {
    const fields = {
      value: new foundry.data.fields.StringField({
        required: true, blank: true, initial: defaults.value ?? "", label: "DND5E.Type"
      }),
      subtype: new foundry.data.fields.StringField({
        required: true, blank: true, initial: defaults.subtype ?? "", label: "DND5E.Subtype"
      }),
      baseItem: new foundry.data.fields.StringField({
        required: true, blank: true, initial: defaults.baseItem ?? "", label: "DND5E.BaseItem"
      })
    };
    if ( !subtype ) delete fields.subtype;
    if ( !baseItem ) delete fields.baseItem;
    super(fields, schemaOptions);
  }
}
