import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for an utility activity.
 *
 * @property {object} roll
 * @property {string} roll.formula  Arbitrary formula that can be rolled.
 * @property {string} roll.name     Label for the rolling button.
 */
export default class UtilityActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      roll: new SchemaField({
        formula: new FormulaField(),
        name: new StringField()
      })
    };
  }
}
