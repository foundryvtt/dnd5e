import BaseActivityBehavior from "./base-activity-behavior.mjs";

const { DocumentUUIDField, SetField } = foundry.data.fields;

/**
 * @import { ApplyActiveEffectActivityBehaviorData } from "./_types.mjs";
 */

/**
 * Data model representing the difficult terrain activity behavior configuration.
 * @extends {foundry.abstract.DataModel<ApplyActiveEffectActivityBehaviorData>}
 * @mixes ApplyActiveEffectActivityBehaviorData
 */
export class ApplyActiveEffectActivityBehavior extends BaseActivityBehavior {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.REGIONBEHAVIORS.APPLYACTIVEEFFECT"];

  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      effects: new SetField(new DocumentUUIDField())
    };
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /** @override */
  createBehaviorData(activity, options={}) {
    return {
      system: {
        effects: this.effects
      },
      type: "applyActiveEffect"
    };
  }

}
