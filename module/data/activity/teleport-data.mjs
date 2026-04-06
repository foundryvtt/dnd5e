import { prepareFormulaValue } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { TeleportActivityData } from "./_types.mjs";
 */

/**
 * Data model for a teleport activity.
 * @extends {BaseActivityData<TeleportActivityData>}
 * @mixes TeleportActivityData
 */
export default class BaseTeleportActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      teleport: new SchemaField({
        unlimited: new BooleanField(),
        value: new FormulaField({ deterministic: true }),
        units: new StringField({ required: true, blank: false, initial: "ft" })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });
    super.prepareFinalData(rollData);

    if ( !this.teleport.unlimited ) {
      prepareFormulaValue(this, "teleport.value", "DND5E.TELEPORT.FIELDS.teleport.value.label", rollData);
    }
  }
}
