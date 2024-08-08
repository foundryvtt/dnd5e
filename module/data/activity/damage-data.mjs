import FormulaField from "../fields/formula-field.mjs";
import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { ArrayField, BooleanField, SchemaField } = foundry.data.fields;

/**
 * Data model for an damage activity.
 *
 * @property {object} damage
 * @property {boolean} damage.critical.allow  Can this damage be critical?
 * @property {boolean} damage.critical.bonus  Extra damage applied when a critical is rolled. Will be added to the first
 *                                            damage part.
 * @property {DamageData[]} damage.parts      Parts of damage to inflict.
 */
export default class DamageActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new SchemaField({
        critical: new SchemaField({
          allow: new BooleanField(),
          bonus: new FormulaField()
        }),
        parts: new ArrayField(new DamageField())
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    return foundry.utils.mergeObject(activityData, {
      damage: {
        critical: {
          allow: false,
          bonus: source.system.critical?.damage ?? ""
        },
        parts: source.system.damage?.parts?.map(part => this.transformDamagePartData(source, part)) ?? []
      }
    });
  }
}
