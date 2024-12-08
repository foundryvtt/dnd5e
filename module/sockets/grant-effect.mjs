/**
 * @typedef {object} GrantEffectConfig
 * @property {string} event           The event name.
 * @property {string} actor           The uuid of the actor to receive the effect.
 * @property {object} effectData      Data used to create the effect.
 * @property {string[]} userIds       The ids of the users that should perform the operation.
 */

/**
 * Name of this socket event.
 * @type {string}
 */
const eventName = "grantEffect";

/* -------------------------------------------- */

/**
 * Grant the effect to a given actor.
 * @param {GrantEffectConfig} data
 */
async function grantEffect(data) {
  const actor = await fromUuid(data.actor);
  if ( actor?.documentName !== "Actor" ) return;
  getDocumentClass("ActiveEffect").create(data.effectData, { parent: actor });
}

/* -------------------------------------------- */

/**
 * Initiate the socket event.
 * @param {Actor5e} actor                 The actor to receive the effect.
 * @param {ActiveEffecet5e} effect        The effect to be duplicated onto the actor.
 * @returns {GrantEffectConfig|void}      The event data.
 */
function initiate(actor, effect) {
  if ( (actor?.documentName !== "Actor") || (effect?.documentName !== "ActiveEffect") ) {
    throw new Error("You must supply both an actor and effect instance for this operation.");
  }

  // Get a valid user to perform the operation.
  // TODO: improve in v13
  const userId = actor.isOwner ? game.user.id : game.users.find(user => {
    return user.active && actor.testUserPermission(user, "OWNER");
  })?.id;

  if (!userId) {
    // TODO: add to i18n
    ui.notifications.error("DND5E.SOCKETS.GrantEffect.Warning.MissingUser", { localize: true });
    return;
  }

  const data = {
    event: eventName,
    userIds: [userId],
    actor: actor.uuid,
    effectData: effect.toObject()
  };

  return data;
}

/* -------------------------------------------- */

export default {
  event: eventName,
  initiate: initiate,
  finalize: grantEffect
};
