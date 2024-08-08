import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

/**
 * Data model for an heal activity.
 *
 * @property {DamageData} healing
 */
export default class HealActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      healing: new DamageField()
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    return foundry.utils.mergeObject(activityData, {
      healing: this.transformDamagePartData(source, source.system.damage?.parts?.[0] ?? ["", ""])
    });
  }
}
