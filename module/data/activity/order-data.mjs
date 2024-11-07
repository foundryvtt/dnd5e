import BaseActivityData from "./base-activity.mjs";

const { DocumentIdField, FilePathField, StringField } = foundry.data.fields;

/**
 * Data model for an order activity.
 * @property {string} order  The issued order.
 */
export default class OrderActivityData extends BaseActivityData {
  /** @override */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        blank: false, required: true, readOnly: true, initial: () => this.metadata.type
      }),
      name: new StringField({ initial: undefined }),
      img: new FilePathField({ initial: undefined, categories: ["IMAGE"], base64: false }),
      order: new StringField({ required: true, blank: false, nullable: false })
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
    this.img = CONFIG.DND5E.facilities.orders[this.order]?.icon || this.metadata?.img;
  }
}
