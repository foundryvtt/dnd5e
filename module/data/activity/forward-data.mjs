import BaseActivityData from "./base-activity.mjs";

const { DocumentIdField, SchemaField } = foundry.data.fields;

/**
 * @import { ForwardActivityData } from "./_types.mjs";
 */

/**
 * Data model for a Forward activity.
 * @extends {BaseActivityData<ForwardActivityData>}
 * @mixes ForwardActivityData
 */
export default class BaseForwardActivityData extends BaseActivityData {
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
        id: new DocumentIdField(),
        item: new DocumentIdField({ initial: null, nullable: true })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    const item = this.activity.item ? this.item.collection.get(this.activity.item) : this.item;
    const activity = item?.system.activities.get(this.activity.id);
    if ( activity && activity.activation.override ) this.activation = activity.toObject().activation;

    super.prepareFinalData(rollData);

    Object.defineProperty(this.activation, "canOverride", {
      value: true,
      configurable: true,
      enumerable: false
    });
  }
}
