import SystemDataModel from "../../abstract.mjs";

/**
 * Data model template for equipment that can be mounted on a vehicle.
 *
 * @property {object} armor          Equipment's armor class.
 * @property {number} armor.value    Armor class value for equipment.
 * @property {object} hp             Equipment's hit points.
 * @property {number} hp.value       Current hit point value.
 * @property {number} hp.max         Max hit points.
 * @property {number} hp.dt          Damage threshold.
 * @property {string} hp.conditions  Conditions that are triggered when this equipment takes damage.
 * @mixin
 */
export default class MountableTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      armor: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.ArmorClass"
        })
      }, {label: "DND5E.ArmorClass"}),
      hp: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.HitPointsCurrent"
        }),
        max: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.HitPointsMax"
        }),
        dt: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 0, label: "DND5E.DamageThreshold"
        }),
        conditions: new foundry.data.fields.StringField({required: true, label: "DND5E.HealthConditions"})
      }, {label: "DND5E.HitPoints"})
    };
  }
}
