import SystemDataModel from "../../abstract.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model template for equipment that can be mounted on a vehicle.
 *
 * @property {object} armor          Equipment's armor class.
 * @property {number} armor.value    Armor class value for equipment.
 * @property {number} cover          Amount of cover does this item affords to its crew on a vehicle.
 * @property {boolean} crewed        Is this equipment currently crewed?
 * @property {object} hp             Equipment's hit points.
 * @property {number} hp.value       Current hit point value.
 * @property {number} hp.max         Max hit points.
 * @property {number} hp.dt          Damage threshold.
 * @property {string} hp.conditions  Conditions that are triggered when this equipment takes damage.
 * @mixin
 */
export default class MountableTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      armor: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.ArmorClass" })
      }, {label: "DND5E.ArmorClass"}),
      cover: new NumberField({ min: 0, max: 1, label: "DND5E.Cover" }),
      crewed: new BooleanField({ label: "DND5E.Crewed" }),
      hp: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.HitPointsCurrent" }),
        max: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.HitPointsMax" }),
        dt: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.DamageThreshold" }),
        conditions: new StringField({required: true, label: "DND5E.HealthConditions"})
      }, {label: "DND5E.HitPoints"}),
      speed: new SchemaField({
        value: new NumberField({required: true, min: 0, label: "DND5E.Speed"}),
        conditions: new StringField({required: true, label: "DND5E.SpeedConditions"})
      }, {label: "DND5E.Speed"})
    };
  }
}
