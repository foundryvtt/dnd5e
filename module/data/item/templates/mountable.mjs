import { defaultUnits } from "../../../utils.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { MountableTemplateData } from "./_types.mjs";
 */

/**
 * Data model template for equipment that can be mounted on a vehicle.
 * @extends SystemDataModel<MountableTemplateData>
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
