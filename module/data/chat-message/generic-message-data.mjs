import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

/**
 * @import { GenericMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a generic roll chat message.
 * @extends {ChatMessageDataModel<GenericMessageSystemData>}
 * @mixes GenericMessageSystemData
 */
export default class GenericMessageData extends ChatMessageDataModel {

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
    template: "systems/dnd5e/templates/chat/generic-card.hbs"
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
