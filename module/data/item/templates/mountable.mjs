import { defaultUnits } from "../../../utils.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model template for equipment that can be mounted on a vehicle.
 *
 * @property {number} cover               Amount of cover this item affords to its crew on a vehicle.
 * @property {object} crew
 * @property {number} crew.max            The number of crew this station can support.
 * @property {string[]} crew.value        The crew assigned to this station.
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
      crew: new SchemaField({
        max: new NumberField({ min: 0, integer: true }),
        value: new ArrayField(new DocumentUUIDField({ type: "Actor" }))
      }),
      hp: new SchemaField({
        conditions: new StringField(),
        dt: new NumberField({ integer: true, min: 0 }),
        max: new NumberField({ integer: true, min: 0 }),
        value: new NumberField({ integer: true, min: 0 })
      }, { required: false, initial: undefined }),
      speed: new SchemaField({
        conditions: new StringField(),
        units: new StringField({ required: true, blank: false, initial: () => defaultUnits("length") }),
        value: new NumberField({ min: 0, integer: true })
      }, { required: false, initial: undefined })
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare mountable item properties.
   */
  prepareMountableData() {
    const { hp } = this;
    if ( hp ) hp.pct = hp.max ? Math.clamp((hp.value / hp.max) * 100, 0, 100) : 0;
  }
}
