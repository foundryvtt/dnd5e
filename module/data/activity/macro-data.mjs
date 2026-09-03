import BaseActivityData from "./base-activity.mjs";

const { BooleanField, DocumentUUIDField, SchemaField } = foundry.data.fields;

/**
 * @import { MacroActivityData } from "./_types.mjs";
 */

/**
 * Data model for a macro activity.
 * @extends {BaseActivityData<MacroActivityData>}
 * @mixes MacroActivityData
 */
export default class BaseMacroActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      macro: new SchemaField({
        uuid: new DocumentUUIDField({ type: "Macro" }),
        chatButton: new BooleanField({ initial: true })
      })
    };
  }
}
