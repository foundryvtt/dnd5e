import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for an utility activity.
 *
 * @property {object} roll
 * @property {string} roll.formula   Arbitrary formula that can be rolled.
 * @property {string} roll.name      Label for the rolling button.
 * @property {boolean} roll.prompt   Should the roll configuration dialog be displayed?
 * @property {boolean} roll.visible  Should the rolling button be visible to all players?
 */
export default class UtilityActivityData extends BaseActivityData {
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
  /*  Data Migrations                             */
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
