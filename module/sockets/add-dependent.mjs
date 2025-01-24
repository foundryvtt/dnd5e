import SocketEvent from "./socket-event.mjs";

/**
 * @typedef {import("./socket-event.mjs").EventData} AddDependentData
 * @property {string} effect            The uuid of the effect to add dependents to.
 * @property {string[]} dependents      The uuids of the effects to add as dependents.
 */

export default class AddDependentData extends SocketEvent {
  /** @inheritDoc */
  static eventName = "addDependent";

  /* -------------------------------------------- */

  /**
   * As a user allowed to do so, perform the operation.
   * @param {AddDependentData} data      The event data.
   */
  static async finalize(data) {
    const uuids = [data.effect, ...data.dependents];
    const effects = await Promise.all(uuids.map(uuid => fromUuid(uuid)));
    if ( effects.some(effect => effect?.documentName !== "ActiveEffect") ) return;
    const effect = effects.shift();
    effect.addDependent(effects);
  }

  /* -------------------------------------------- */

  /**
   * Initiate the socket event.
   * @param {ActiveEffect5e} effect             The effect to add dependents to.
   * @param {...ActiveEffect5e} dependents      The effects to add as dependents.
   * @returns {AddDependentData|void}           The event data.
   */
  static initiate(effect, ...dependents) {
    if ( [effect, ...dependents].some(effect => effect?.documentName !== "ActiveEffect") ) {
      throw new Error("You must supply both an effect and dependent effect instances for this operation.");
    }

    // Get a valid user to perform the operation.
    // TODO: improve in v13
    const userId = effect.isOwner ? game.user.id : game.users.find(user => {
      return user.active && effect.testUserPermission(user, "OWNER");
    })?.id;

    if ( !userId ) {
      // TODO: add to i18n
      ui.notifications.error("DND5E.SOCKETS.AddDependent.Warning.MissingUser", { localize: true });
      return;
    }

    return {
      event: AddDependentData.eventName,
      userIds: [userId],
      effect: effect.uuid,
      dependents: dependents.map(effect => effect.uuid)
    };
  }
}
