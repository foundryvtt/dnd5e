import TypeDataField5e from "../../fields/type-data-field.mjs";

const { DocumentIdField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing a region behavior applied by an activity to its template.
 */
export default class AppliedBehaviorField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      config: new TypeDataField5e({
        getModel: type => CONFIG.DND5E.activityBehaviorTypes[type]?.model
      }),
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

  /* -------------------------------------------- */

  /** @inheritDoc */
  _cleanType(data, options, _state={}) {
    const type = data?.type ?? _state.source?.type;
    return super._cleanType(data, options, type ? { ..._state, dnd5e: { type } } : _state);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  initialize(value, model, options={}) {
    return super.initialize(value, model, value?.type ? { ...options, dnd5e: { type: value.type } } : options);
  }
}
