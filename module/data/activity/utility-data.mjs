import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { UtilityActivityData } from "./_types.mjs";
 */

/**
 * Data model for an utility activity.
 * @extends {BaseActivityData<UtilityActivityData>}
 * @mixes {UtilityActivityData}
 */
export default class BaseUtilityActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      roll: new SchemaField({
        formula: new FormulaField(),
        name: new StringField(),
        prompt: new BooleanField(),
        visible: new BooleanField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData, options) {
    return foundry.utils.mergeObject(activityData, {
      roll: {
        formula: source.system.formula ?? "",
        name: "",
        prompt: false,
        visible: false
      }
    });
  }
}
