import SocketEvent from "./socket-event.mjs";

/**
 * @typedef {import("./socket-event.mjs").EventData} GrantEffectData
 * @property {string} actor           The uuid of the actor to receive the effect.
 * @property {object} effectData      Data used to create the effect.
 */

export default class GrantEffectEvent extends SocketEvent {
  /** @inheritDoc */
  static eventName = "grantEffect";

  /* -------------------------------------------- */

  /**
   * As a user allowed to do so, perform the operation.
   * @param {GrantEffectData} data      The event data.
   */
  static async finalize(data) {
    const actor = await fromUuid(data.actor);
    if ( actor?.documentName !== "Actor" ) return;
    getDocumentClass("ActiveEffect").create(data.effectData, { parent: actor });
  }

  /* -------------------------------------------- */

  /**
   * Initiate the socket event.
   * @param {Actor5e} actor             The actor to receive the effect.
   * @param {ActiveEffect5e} effect     The effect to be duplicated onto the actor.
   * @returns {GrantEffectData|void}    The event data.
   */
  static initiate(actor, effect) {
    if ( (actor?.documentName !== "Actor") || (effect?.documentName !== "ActiveEffect") ) {
      throw new Error("You must supply both an actor and effect instance for this operation.");
    }

    // Get a valid user to perform the operation.
    // TODO: improve in v13
    const userId = actor.isOwner ? game.user.id : game.users.find(user => {
      return user.active && actor.testUserPermission(user, "OWNER");
    })?.id;

    if ( !userId ) {
      // TODO: add to i18n
      ui.notifications.error("DND5E.SOCKETS.GrantEffect.Warning.MissingUser", { localize: true });
      return;
    }

    return {
      event: GrantEffectEvent.eventName,
      userIds: [userId],
      actor: actor.uuid,
      effectData: effect.toObject()
    };
  }
}
