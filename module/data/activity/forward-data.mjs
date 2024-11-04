import BaseActivityData from "./base-activity.mjs";

const { DocumentIdField, SchemaField } = foundry.data.fields;

/**
 * Data model for a Forward activity.
 *
 * @property {object} activity
 * @property {string} activity.id  ID of the activity to forward to.
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
