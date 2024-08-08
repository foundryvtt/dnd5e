const { NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Field for storing activation data.
 *
 * @property {string} type            Activation type (e.g. action, legendary action, minutes).
 * @property {number} value           Scalar value associated with the activation.
 * @property {string} condition       Condition required to activate this activity.
 */
export default class ActivationField extends SchemaField {
  constructor(fields={}, options={}) {
    fields = {
      type: new StringField({ initial: "action" }),
      value: new NumberField({ min: 0, integer: true }),
      condition: new StringField(),
      ...fields
    };
    super(fields, options);
  }
}
