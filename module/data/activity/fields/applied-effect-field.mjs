const { DocumentIdField, NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing an active effects applied by an activity.
 */
export default class AppliedEffectField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      _id: new DocumentIdField(),
      level: new SchemaField({
        min: new NumberField({ min: 0, integer: true }),
        max: new NumberField({ min: 0, integer: true })
      }),
      ...fields
    };
    Object.entries(fields).forEach(([k, v]) => !v ? delete fields[k] : null);
    super(fields, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    const obj = super.initialize(value, model, options);
    const item = model.item;

    Object.defineProperty(obj, "effect", {
      get() { return item?.effects.get(this._id); },
      configurable: true
    });

    return obj;
  }
}
