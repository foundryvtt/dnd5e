import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import ActivationsField from "./fields/activations-field.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const TextEditor = foundry.applications.ux.TextEditor.implementation;
const { ForeignDocumentField, StringField } = foundry.data.fields;

/**
 * @import ActivationsData from "./fields/activations-field.mjs";
 * @import { ActorDeltasData } from "./fields/deltas-field.mjs";
 */

/**
 * Data stored in a rest chat message.
 *
 * @property {ActivationsData} activations  Activities that can be used after this rest, stored as relative UUIDs.
 * @property {ActorDeltasData} deltas       Actor/item recovery from this turn change.
 * @property {ChatMessage5e} [request]      Rest request chat message for which this rest was performed.
 * @property {string} type                  Type of rest performed.
 */
export default class RestMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activations: new ActivationsField(),
      deltas: new ActorDeltasField(),
      request: new ForeignDocumentField(foundry.documents.BaseChatMessage),
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

    if ( context.actor?.testUserPermission(game.user, "OBSERVER") ) {
      context.activities = ActivationsField.processActivations.call(this.activations, this.actor);
      context.deltas = ActorDeltasField.processDeltas.call(this.deltas, this.actor, this.parent.rolls);
    }

    return context;
  }
}
