import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const {
  ArrayField, DocumentUUIDField, ForeignDocumentField, ObjectField, SchemaField, StringField
} = foundry.data.fields;

/**
 * @typedef RequestTargetData
 * @property {string} actor            Actor for whom the request was made.
 * @property {ChatMessage5e} [result]  Chat message indicating the result of the request.
 * @property {User} [user]             Specific user who should handle the request. If not present, then any owner of
 *                                     the actor is able to handle it.
 */

/**
 * Custom chat message type used for requesting an action be performed for a specific actor.
 *
 * @property {object} button
 * @property {string} [button.icon]         Font awesome code or path to SVG icon for the request button.
 * @property {string} [button.label]        Label used for the button.
 * @property {object} data                  Arbitrary data passed to the request handling method in addition to actor.
 * @property {string} handler               Name of the request handler specified in the config.
 * @property {RequestTargetData[]} targets  Actors that were the target of the request.
 */
export default class RequestMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      button: new SchemaField({
        icon: new StringField(),
        label: new StringField()
      }),
      data: new ObjectField(),
      handler: new StringField({ required: true, blank: false }),
      targets: new ArrayField(new SchemaField({
        actor: new DocumentUUIDField({ type: "Actor", validate: RequestMessageData.#validateActorUuid }),
        result: new ForeignDocumentField(foundry.documents.BaseChatMessage),
        user: new ForeignDocumentField(foundry.documents.BaseUser)
      }))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      handleRequest: RequestMessageData.#handleRequest
    },
    template: "systems/dnd5e/templates/chat/request-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Highlight successes and failures in the results, if applicable.
   * @param {HTMLElement} element  The rendered chat card.
   * @protected
   */
  _highlightSuccessFailure(element) {
    for ( const item of element.querySelectorAll(".targets [data-uuid]") ) {
      const { uuid } = item.dataset;
      const { result } = this.targets.find(t => t.actor === uuid) ?? {};
      const [roll] = result?.rolls ?? [];
      if ( !this.parent.shouldDisplayChallenge || (!roll?.isSuccess && !roll?.isFailure) ) continue;
      const status = item.querySelector(".status");
      status.classList.toggle("success", roll.isSuccess);
      status.classList.toggle("failure", roll.isFailure);
      status.append(foundry.applications.fields.createFontAwesomeIcon(roll.isSuccess ? "check" : "xmark"));
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(element) {
    super._onRender(element);
    this._highlightSuccessFailure(element);
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    return {
      button: {
        icon: this.button.icon,
        label: game.i18n.localize(this.button.label || "DND5E.CHATMESSAGE.REQUEST.Action.Handle")
      },
      content: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.parent.content, { rollData: this.parent.getRollData() }
      ),
      targets: this.targets.map(t => {
        const actor = fromUuidSync(t.actor);
        if ( !actor ) return null;
        const visible = game.user.isGM || (!!t.user && (game.user === t.user)) || (!t.user && actor.isOwner);
        const { result } = t;
        const completed = result !== null;
        const total = result?.rolls[0]?.total;
        return { actor, completed, total, visible };
      }).filter(_ => _)
    };
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle clicking the button.
   * @this {RequestMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   * @returns {Promise<ChatMessage5e|void>}
   */
  static async #handleRequest(event, target) {
    const actor = fromUuidSync(target.closest("[data-uuid]").dataset.uuid);
    const result = await CONFIG.DND5E.requests[this.handler](actor, this.parent, this.data, { event });
    if ( (result instanceof ChatMessage) && !result.getFlag("dnd5e", "requestResult") ) {
      return result.setFlag("dnd5e", "requestResult", { actorUuid: actor.uuid, requestId: this.parent.id });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle associating a newly created request result message with an actor and updating this message.
   * @param {ChatMessage5e} message  The created chat message.
   */
  static onCreateMessage(message) {
    const flag = message.getFlag("dnd5e", "requestResult");
    if ( flag && (game.users.activeGM === game.user) ) RequestMessageData.#updateRequestTargets(message, flag);
  }

  /* -------------------------------------------- */

  /**
   * Handle associating an updated request result message with an actor and updating this message.
   * @param {ChatMessage5e} message
   * @param {object} changes
   * @param {object} options
   * @param {string} userId
   */
  static onUpdateResultMessage(message, changes, options, userId) {
    const flag = foundry.utils.getProperty(changes, "flags.dnd5e.requestResult");
    if ( flag && (game.users.activeGM === game.user) ) RequestMessageData.#updateRequestTargets(message, flag);
  }

  /* -------------------------------------------- */

  /**
   * Update target information when a request result is processed.
   * @param {ChatMessage5e} message    The message fulfilling a request.
   * @param {object} result
   * @param {string} result.actorUuid  The UUID of the actor fulfilling the request.
   * @param {string} result.requestId  The ID of the original request message.
   */
  static #updateRequestTargets(message, result) {
    const actor = fromUuidSync(result.actorUuid);
    const request = game.messages.get(result.requestId);
    if ( !actor || !request ) return;

    const index = request.system.targets.findIndex(t => t.actor === result.actorUuid);
    const target = request.system.targets[index];
    if ( !target ) return;

    const targetsData = request.system.toObject().targets ?? [];
    targetsData[index].result = message.id;
    request.update({ "system.targets": targetsData });
  }

  /* -------------------------------------------- */
  /*  Validation                                  */
  /* -------------------------------------------- */

  /**
   * Ensure provided Actor UUIDs can be resolved synchronously.
   * @param {string} uuid  The UUID.
   */
  static #validateActorUuid(uuid) {
    if ( uuid.startsWith(".") || uuid.startsWith("Compendium.") ) {
      throw new Error("Request Message target UUIDs may not be relative or inside a compendium.");
    }
  }
}
