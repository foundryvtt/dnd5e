const { SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Field for storing standard trait data.
 */
export default class SimpleTraitField extends SchemaField {
  constructor(fields={}, { initialValue=[], ...options }={}) {
    fields = {
      value: new SetField(new StringField(), { label: "DND5E.TraitsChosen", initial: initialValue }),
      custom: new StringField({ required: true, label: "DND5E.Special" }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
