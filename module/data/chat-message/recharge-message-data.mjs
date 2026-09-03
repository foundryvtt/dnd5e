import RollMessageData from "./roll-message-data.mjs";

/**
 * @import { RechargeMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a recharge chat message.
 * @extends {RollMessageData<RechargeMessageSystemData>}
 * @mixes RechargeMessageSystemData
 */
export default class RechargeMessageData extends RollMessageData {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/recharge-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.parent.getAssociatedItem();
    if ( this.parent.isContentVisible && item ) context.header = {
      item,
      activity: this.activity,
      subtitle: [this.activity?.name, this.parent.flavor].filterJoin(" • ")
    };
    return context;
  }
}
