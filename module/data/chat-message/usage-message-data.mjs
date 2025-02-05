import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";
import { ActorDeltasField } from "./fields/deltas-field.mjs";

const { ArrayField, DocumentIdField, ObjectField, StringField } = foundry.data.fields;

/**
 * @import { UsageMessageSystemData } from "./_types.mjs";
 */

/**
 * Data stored in a usage chat message.
 * @extends {ChatMessageDataModel<UsageMessageSystemData>}
 * @mixes UsageMessageSystemData
 */
export default class UsageMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      cause: new StringField(),
      deltas: new ActorDeltasField({}, { initial: null, nullable: true }),
      effects: new ArrayField(new DocumentIdField())
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    template: "systems/dnd5e/templates/chat/usage-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The activity for the chat message.
   * @type {Activity}
   */
  get activity() {
    return this.parent.getAssociatedActivity();
  }

  /* -------------------------------------------- */

  /**
   * The actor for the chat message.
   * @type {Actor5e}
   */
  get actor() {
    return this.parent.getAssociatedActor();
  }

  /* -------------------------------------------- */

  /**
   * The item for the chat message.
   * @type {Item5e}
   */
  get item() {
    return this.parent.getAssociatedItem();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    return {
      content: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.parent.content, { rollData: this.parent.getRollData() }
      ),
      effects: this.effects
        .map(id => this.item?.effects.get(id))
        .filter(e => e && (game.user.isGM || (e.transfer & (this.parent.author?.id === game.user.id))))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    this.activity?.onRenderChatCard(this.parent, element);
    this._displayChatActionButtons(element);
    if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      element.querySelectorAll(".description.collapsible").forEach(el => el.classList.add("collapsed"));
    }
    this.activity?.activateChatListeners(this.parent, element);
  }

  /* -------------------------------------------- */

  /**
   * Control visibility of chat card action buttons based on viewing user.
   * @param {HTMLElement} element  Rendered contents of the message.
   * @protected
   */
  _displayChatActionButtons(element) {
    if ( this.parent.shouldDisplayChallenge ) element.dataset.displayChallenge = "";

    const isCreator = game.user.isGM || this.actor?.isOwner || (this.parent.author.id === game.user.id);
    for ( const button of element.querySelectorAll(".card-buttons button") ) {
      if ( button.dataset.visibility === "all" ) continue;

      // GM buttons should only be visible to GMs, otherwise button should only be visible to message's creator
      if ( ((button.dataset.visibility === "gm") && !game.user.isGM) || !isCreator
        || this.activity?.shouldHideChatButton(button, this.parent) ) button.hidden = true;
    }
  }
}
