import BaseActivityData from "./base-activity.mjs";

const { DocumentIdField, StringField } = foundry.data.fields;

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
      targetItem: new StringField({ 
        required: false, 
        nullable: true, 
        initial: null, 
        label: "DND5E.ACTIVITY.FIELDS.Forward.Item.Label" 
      }),
      activity: new DocumentIdField({ 
        required: true, 
        nullable: true, 
        initial: null, 
        label: "DND5E.ACTIVITY.FIELDS.Forward.Activity.Label" 
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    const actor = this.actor;
    
    const targetItem = actor?.items.get(this.targetItem) ?? this.item;
    const activity = targetItem.system.activities.get(this.activity.id);
    if ( activity && activity.activation.override ) this.activation = activity.toObject().activation;

    super.prepareFinalData(rollData);

    Object.defineProperty(this.activation, "canOverride", {
      value: true,
      configurable: true,
      enumerable: false
    });
  }
}
