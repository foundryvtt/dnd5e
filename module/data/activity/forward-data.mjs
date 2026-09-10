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
        nullable: true,
        initial: null,
        label: "DND5E.FORWARD.FIELDS.targetItem.label",
        hint: "DND5E.FORWARD.FIELDS.targetItem.hint"
      }),
      activity: new DocumentIdField({
        nullable: true,
        initial: null,
        label: "DND5E.FORWARD.FIELDS.activity.label",
        hint: "DND5E.FORWARD.FIELDS.activity.hint"
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Item containing the activity to forward to.
   * @type {Item5e|undefined}
   */
  get targetItemDocument() {
    if ( !this.targetItem ) return this.item;
    const target = this._remapConsumptionTarget(this.targetItem);
    return this.actor?.items.get(target);
  }

  /* -------------------------------------------- */

  /**
   * Whether an activity is a valid forwarding target.
   * @param {Activity|undefined} activity  Activity to test.
   * @returns {boolean}
   */
  canForwardTo(activity) {
    return !!activity && (activity.type !== "forward") && (CONFIG.DND5E.activityTypes[activity.type] !== false);
  }

  /* -------------------------------------------- */

  /**
   * Available activity to forward to.
   * @type {Activity|undefined}
   */
  get targetActivity() {
    const activity = this.targetItemDocument?.system.activities.get(this.activity);
    return this.canForwardTo(activity) ? activity : undefined;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( foundry.utils.getType(source.activity) === "Object" ) source.activity = source.activity.id ?? null;
    return source;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    const targetItem = this.targetItemDocument;
    const activity = this.targetActivity;
    if ( this.actor && !targetItem ) {
      const message = _loc("DND5E.FORWARD.Warning.ItemNotFound", { target: this.targetItem });
      this.actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
    } else if ( this.actor && !activity ) {
      const message = _loc("DND5E.FORWARD.Warning.InvalidActivity", {
        activity: this.name,
        item: this.item.name,
        targetActivity: this.activity || _loc("DND5E.None"),
        targetItem: targetItem.name
      });
      this.actor._preparationWarnings.push({ message, link: this.uuid, type: "warning" });
    }
    if ( activity && activity.activation.override ) this.activation = activity.toObject().activation;

    super.prepareFinalData(rollData);

    Object.defineProperty(this.activation, "canOverride", {
      value: true,
      configurable: true,
      enumerable: false
    });
  }
}
