import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { ArrayField, BooleanField, SchemaField } = foundry.data.fields;

/**
 * Data model for an damage activity.
 *
 * @property {object} damage
 * @property {boolean} damage.allowCritical  Can this damage be critical?
 * @property {DamageData[]} damage.parts     Parts of damage to inflict.
 */
export default class DamageActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new SchemaField({
        allowCritical: new BooleanField(),
        parts: new ArrayField(new DamageField())
      })
    };
  }
}
