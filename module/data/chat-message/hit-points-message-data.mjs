import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

/**
 * @import { HitPointsMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a hit points roll chat message.
 * @extends {ChatMessageDataModel<HitPointsMessageSystemData>}
 * @mixes HitPointsMessageSystemData
 */
export default class HitPointsMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/hit-points-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const isPrivate = !this.parent.isContentVisible;
    return {
      rolls: await Promise.all(this.parent.rolls.map(roll => roll.render({ isPrivate, message: this.parent })))
    };
  }
}
