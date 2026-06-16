/**
 * @typedef {"crew"|"draft"|"passengers"} CrewArea5e
 */

/* -------------------------------------------- */

/**
 * @type PartyRequestDialogOptions
 * @property {object}                     request
 * @property {PartyRequestCondition|null} request.condition  Callback used to determine if an actor should be included.
 * @property {Actor5e|null}               request.group      Group actor to fetch the actor list from, otherwise uses
 *                                                           the primary party if one is set or falls back to the
 *                                                           assigned characters.
 */

/**
 * @callback PartyRequestCondition
 * @param {Actor5e} actor  An actor that might be able to receive the request.
 * @returns {boolean}      Should the actor be shown in the dialog?
 */
