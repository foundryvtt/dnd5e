import ChatMessageDataModel from "../abstract/chat-message-data-model.mjs";

const { ArrayField, BooleanField, ForeignDocumentField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef RestRequestTargetData
 * @property {Actor5e} actor         Actor whose rest was requested.
 * @property {ChatMessage5e} result  Rest chat message indicating the rest was completed for this actor.
 */

/**
 * Data stored in a rest chat message.
 *
 * @property {boolean} newDay                   A new day has occurred during this rest.
 * @property {RestRequestTargetData[]} targets  Actors that were the target of the rest request.
 * @property {string} type                      Type of rest requested.
 */
export default class RestRequestMessageData extends ChatMessageDataModel {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      newDay: new BooleanField(),
      targets: new ArrayField(new SchemaField({
        actor: new ForeignDocumentField(foundry.documents.BaseActor),
        result: new ForeignDocumentField(foundry.documents.BaseChatMessage)
      })),
      type: new StringField()
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    actions: {
      rest: RestRequestMessageData.#restActor
    },
    template: "systems/dnd5e/templates/chat/rest-request-card.hbs"
  }, { inplace: false }));

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const restConfig = CONFIG.DND5E.restTypes[this.type];
    if ( !restConfig ) return {};

    const context = {
      button: { icon: restConfig.icon, label: restConfig.label },
      targets: this.targets.map(t => {
        if ( !t.actor || (this.complete && !t.result) ) return null;
        return { actor: t.actor, completed: t.result !== null };
      }).filter(_ => _)
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle associating a newly created rest result message with an actor and updating this message.
   * @param {ChatMessage5e} message
   */
  static onCreateRestMessage(message) {
    if ( (message.type !== "rest") || (game.users.activeGM !== game.user) ) return;

    const actor = message.system.actor;
    const request = message.system.request;
    const index = request?.system.targets?.findIndex(t => t.actor === actor);
    const target = request.system.targets?.[index];
    if ( !target || target.result ) return;

    const targetsData = request?.system.toObject().targets ?? [];
    targetsData[index].result = message.id;
    request.update({ "system.targets": targetsData });
  }

  /* -------------------------------------------- */

  /**
   * Handle resting an actor.
   * @this {RestRequestMessageData}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #restActor(event, target) {
    const actor = fromUuidSync(target.closest("[data-uuid]")?.dataset.uuid);
    try {
      target.disabled = true;
      const config = {
        newDay: this.newDay,
        request: this.parent,
        type: this.type
      };
      await actor[config.type === "short" ? "shortRest" : "longRest"]({
        ...config, advanceBastionTurn: false, advanceTime: false
      });
    } finally {
      target.disabled = false;
    }
  }
}
