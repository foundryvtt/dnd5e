import ItemTypeField from "../fields/item-type-field.mjs";
const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;
/**
 * Shared contents of the attributes schema between various actor types.
 */
export default class FeatureFields {
  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {object} prerequisites
   * @property {number} prerequisites.level           Character or class level required to choose this feature.
   * @property {Set<string>} properties               General properties of a feature item.
   * @property {string} requirements                  Actor details required to use this feature.
   * @property {object} recharge                      Details on how a feature can roll for recharges.
   * @property {number} recharge.value                Minimum number needed to roll on a d6 to recharge this feature.
   * @property {boolean} recharge.charged             Does this feature have a charge remaining?
   */
  static get feature() {
    return {
      type: new ItemTypeField({baseItem: false}, {label: "DND5E.ItemFeatureType"}),
      prerequisites: new SchemaField({
        level: new NumberField({integer: true, min: 0})
      }),
      properties: new SetField(new StringField(), {
        label: "DND5E.ItemFeatureProperties"
      }),
      requirements: new StringField({required: true, nullable: true, label: "DND5E.Requirements"}),
      recharge: new SchemaField({
        value: new NumberField({
          required: true, integer: true, min: 1, label: "DND5E.FeatureRechargeOn"
        }),
        charged: new BooleanField({required: true, label: "DND5E.Charged"})
      }, {label: "DND5E.FeatureActionRecharge"})
    };
  }
}
