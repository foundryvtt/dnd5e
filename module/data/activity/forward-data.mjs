import BaseActivityData from "./base-activity.mjs";

const { DocumentIdField, SchemaField } = foundry.data.fields;

/**
 * @import { ForwardActivityData } from "./_types.mjs";
 */

/**
 * Data model for a Forward activity.
 * @extends {BaseActivityData<ForwardActivityData>}
 * @mixes {ForwardActivityData}
 */
export default class ForwardActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    const schema = super.defineSchema();
    delete schema.duration;
    delete schema.effects;
    delete schema.range;
    delete schema.target;
    return {
      ...schema,
      activity: new SchemaField({
        id: new DocumentIdField()
      })
    };
  }
}
