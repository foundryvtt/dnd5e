import ApplyActiveEffect5eRegionBehaviorType from "./apply-active-effect.mjs";
import BaseActivityBehavior from "./base-activity-behavior.mjs";

/**
 * The data model for a region behavior that represents an area of antimagic.
 */
export default class AntimagicRegionBehaviorType extends ApplyActiveEffect5eRegionBehaviorType {

  /** @override */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  _evaluateConditions(token) {
    return true;
  }

  /* -------------------------------------------- */

  /** @override */
  async _getEffectsToCreate(actor, effects) {
    const effect = await ActiveEffect.implementation.fromStatusEffect("antimagic");
    effect.updateSource({ origin: this.behavior.uuid });
    return [effect];
  }
}

/* -------------------------------------------- */

/**
 * Data model representing the antimagic activity behavior configuration.
 */
export class AntimagicActivityBehavior extends BaseActivityBehavior {

  /** @override */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  createBehaviorData(activity, options={}) {
    return {
      type: "dnd5e.antimagic"
    };
  }
}
