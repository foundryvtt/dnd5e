import { defaultUnits, prepareFormulaValue } from "../../utils.mjs";
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
        useRange: new BooleanField({ initial: true }),
        units: new StringField({ required: true, blank: false, initial: () => defaultUnits("length") }),
        unlimited: new BooleanField(),
        value: new FormulaField({ deterministic: true })
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

    if ( this.teleport.useRange ) {
      this.teleport.unlimited = this.range.units === "any";
      if ( this.range.scalar ) {
        this.teleport.units = this.range.units;
        this.teleport.value = this.range.value;
      }
    } else if ( !this.teleport.unlimited ) {
      prepareFormulaValue(this, "teleport.value", "DND5E.TELEPORT.FIELDS.teleport.value.label", rollData);
    }
  }
}
