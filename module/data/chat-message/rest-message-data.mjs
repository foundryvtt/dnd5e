import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { StringField } = foundry.data.fields;

/**
 * @import { ActorDeltasData } from "./fields/deltas-field.mjs";
 */

/**
 * Data stored in a rest chat message.
 *
 * @property {ActorDeltasData} deltas  Actor/item recovery from this turn change.
 * @property {string} type             Type of rest performed.
 */
export default class RestMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      deltas: new ActorDeltasField(),
      type: new StringField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/rest-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor for the chat message.
   * @type {Actor5e}
   */
  get actor() {
    return this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {
      actor: this.actor,
      content: await TextEditor.enrichHTML(this.parent.content, { rollData: this.parent.getRollData() })
    };

    if ( context.actor?.isOwner ) {
      context.deltas = ActorDeltasField.processDeltas.call(this.deltas, this.actor);
    }

    return context;
  }
}
