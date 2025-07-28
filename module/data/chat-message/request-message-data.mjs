import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const { ArrayField, ForeignDocumentField, ObjectField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef RequestTargetData
 * @property {Actor5e} actor           Actor for whom the request was made.
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
        actor: new ForeignDocumentField(foundry.documents.BaseActor),
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
        if ( !t.actor ) return null;
        const visible = game.user.isGM || (!!t.user && (game.user === t.user)) || (!t.user && t.actor.isOwner);
        return { actor: t.actor, completed: t.result !== null, visible };
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
   */
  static async #handleRequest(event, target) {
    const actor = fromUuidSync(target.closest("[data-uuid]").dataset.uuid);
    const result = await CONFIG.DND5E.requests[this.handler](actor, this.parent, this.data);
    if ( result instanceof ChatMessage ) {
      result.setFlag("dnd5e", "requestResult", { actorId: actor.id, requestId: this.parent.id });
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle associating a newly created rest result message with an actor and updating this message.
   * @param {ChatMessage5e} message
   * @param {object} changes
   * @param {object} options
   * @param {string} userId
   */
  static onUpdateResultMessage(message, changes, options, userId) {
    const flag = foundry.utils.getProperty(changes, "flags.dnd5e.requestResult");
    if ( !flag || (game.users.activeGM !== game.user) ) return;

    const actor = game.actors.get(flag.actorId);
    const request = game.messages.get(flag.requestId);
    if ( !actor || !request ) return;

    const index = request.system.targets.findIndex(t => t.actor === actor);
    const target = request.system.targets[index];
    if ( !target ) return;

    const targetsData = request.system.toObject().targets ?? [];
    targetsData[index].result = message.id;
    request.update({ "system.targets": targetsData });
  }
}
