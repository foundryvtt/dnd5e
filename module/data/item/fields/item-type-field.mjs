const { SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef ItemTypeData
 * @param {string} value     Primary type for this item.
 * @param {string} subtype   Secondary type within the primary type.
 * @param {string} baseItem  Base item identifier.
 */

/**
 * A field for storing Item type data.
 *
 * @param {object} [options={}]                   Options to configure this field's behavior.
 * @param {string} [options.value]                An initial value for the Item's type.
 * @param {string|boolean} [options.subtype]      An initial value for the Item's subtype, or false to exclude it.
 * @param {string|boolean} [options.baseItem]     An initial value for the Item's baseItem, or false to exclude it.
 * @param {DataFieldOptions} [schemaOptions={}]   Options forwarded to the SchemaField.
 */
export default class ItemTypeField extends SchemaField {
  constructor(options={}, schemaOptions={}) {
    const fields = {
      value: new StringField({
        required: true, blank: true, initial: options.value ?? "", label: "DND5E.Type"
      }),
      subtype: new StringField({
        required: true, blank: true, initial: options.subtype ?? "", label: "DND5E.Subtype"
      }),
      baseItem: new StringField({
        required: true, blank: true, initial: options.baseItem ?? "", label: "DND5E.BaseItem"
      })
    };
    if ( options.subtype === false ) delete fields.subtype;
    if ( options.baseItem === false ) delete fields.baseItem;
    super(fields, schemaOptions);
  }
}
