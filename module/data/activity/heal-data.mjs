import AppliedRules from "../../documents/applied-rules.mjs";
import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

/**
 * @import { HealActivityData } from "./_types.mjs";
 */

/**
 * Data model for an heal activity.
 * @extends {BaseActivityData<HealActivityData>}
 * @mixes HealActivityData
 */
export default class BaseHealActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      healing: new DamageField()
    };
  }

  /* -------------------------------------------- */

  /** @override */
  static damageRuleCategory = "healing";

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData, options) {
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
    this.prepareDamageLabel(rollData);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @override */
  getDamageConfig(config={}, { formulaOptions, rollData }={}) {
    if ( !this.healing.formula ) return foundry.utils.mergeObject({ rolls: [] }, config);

    const rollConfig = foundry.utils.mergeObject({ critical: { allow: false } }, config);
    rollData ??= this.getRollData({ roll: true });
    const rules = {
      bonus: AppliedRules.collect(`${this.constructor.damageRuleCategory}:bonus`, this.actor, this.item).toArray(),
      consumed: new Set()
    };
    rollConfig.rolls = [
      this._processDamagePart(this.healing, rollConfig, rollData, 0, { formulaOptions, rules })
    ].concat(config.rolls ?? []);

    return rollConfig;
  }
}
