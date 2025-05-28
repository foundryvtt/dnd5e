import SystemDataModel from "../../abstract/system-data-model.mjs";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model template for equipment that can be mounted on a vehicle.
 *
 * @property {number} cover               Amount of cover this item affords to its crew on a vehicle.
 * @property {boolean} crewed             Is this equipment currently crewed?
 * @property {object} hp
 * @property {number} hp.value            Current hit point value.
 * @property {number} hp.max              Max hit points.
 * @property {number} hp.dt               Damage threshold.
 * @property {string} hp.conditions       Conditions that are triggered when this equipment takes damage.
 * @property {object} speed
 * @property {string} speed.conditions    Conditions that may affect item's speed.
 * @property {number} speed.value         Speed granted by this piece of equipment measured in feet or meters
 *                                        depending on system setting.
 * @mixin
 */
export default class MountableTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      cover: new NumberField({ min: 0, max: 1 }),
      crewed: new BooleanField(),
      hp: new SchemaField({
        conditions: new StringField(),
        dt: new NumberField({ integer: true, min: 0 }),
        max: new NumberField({ integer: true, min: 0 }),
        value: new NumberField({ integer: true, min: 0 })
      }, { required: false, initial: undefined }),
      speed: new SchemaField({
        conditions: new StringField(),
        value: new NumberField({ min: 0 })
      }, { required: false, initial: undefined })
    };
  }
}
