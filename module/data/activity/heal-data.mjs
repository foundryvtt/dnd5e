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

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });
    super.prepareFinalData(rollData);
    this.prepareDamageLabel([this.healing], rollData);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @override */
  getDamageConfig(config={}) {
    if ( !this.healing.formula ) return foundry.utils.mergeObject({ rolls: [] }, config);

    const scaling = config.scaling ?? 0; // TODO: Set properly once scaling is handled during activation
    const rollConfig = foundry.utils.mergeObject({ critical: { allow: false }, scaling }, config);
    const rollData = this.getRollData();
    rollConfig.rolls = [this._processDamagePart(this.healing, rollConfig, rollData)].concat(config.rolls ?? []);

    return rollConfig;
  }
}
