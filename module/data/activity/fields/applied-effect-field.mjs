const { DocumentIdField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

/**
 * Field for storing an active effects applied by an activity.
 */
export default class AppliedEffectField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      _id: new DocumentIdField(),
      uuid: new DocumentUUIDField(),
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
      get() {
        foundry.utils.logCompatibilityWarning(
          "Activity effects should now be accessed using the `getEffect()` method, which may be asynchronous.",
          { since: "DnD5e 6.0", until: "DnD5e 6.2" }
        );
        return this.getEffect();
      },
      configurable: true
    });
    Object.defineProperty(obj, "getEffect", {
      value: () => obj.uuid ? fromUuid(obj.uuid) : item?.effects.get(obj._id),
      configurable: true
    });
    Object.defineProperty(obj, "relativeUUID", {
      value: obj.uuid ?? `.ActiveEffect.${obj._id}`,
      configurable: true
    });

    return obj;
  }
}
