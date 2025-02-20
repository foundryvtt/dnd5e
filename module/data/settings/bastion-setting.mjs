const { BooleanField, NumberField } = foundry.data.fields;

/**
 * A data model that represents the Bastion configuration options.
 */
export default class BastionSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      button: new BooleanField({
        required: true, label: "DND5E.Bastion.Button.Label", hint: "DND5E.Bastion.Button.Hint"
      }),
      duration: new NumberField({
        required: true, positive: true, integer: true, initial: 7, label: "DND5E.Bastion.Duration.Label"
      }),
      enabled: new BooleanField({
        required: true, label: "DND5E.Bastion.Enabled.Label", hint: "DND5E.Bastion.Enabled.Hint"
      })
    };
  }
}
