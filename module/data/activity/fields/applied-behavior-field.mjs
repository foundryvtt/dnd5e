const { DocumentIdField, NumberField, ObjectField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing an region behaviors applied by an activity to its template.
 */
export default class AppliedBehaviorField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      config: new ObjectField(),
      level: new SchemaField({
        min: new NumberField({ min: 0, integer: true }),
        max: new NumberField({ min: 0, integer: true })
      }),
      name: new StringField(),
      type: new StringField({ required: true, readonly: true }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }
}
