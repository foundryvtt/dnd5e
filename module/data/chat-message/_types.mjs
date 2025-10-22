/**
 * @import { ActivationsData, ActorDeltasData } from "./fields/_types.mjs";
 */

/**
 * @typedef RequestMessageData
 * @property {object} button
 * @property {string} [button.icon]         Font awesome code or path to SVG icon for the request button.
 * @property {string} [button.label]        Label used for the button.
 * @property {object} data                  Arbitrary data passed to the request handling method in addition to actor.
 * @property {string} handler               Name of the request handler specified in the config.
 * @property {RequestTargetData[]} targets  Actors that were the target of the request.
 */

/**
 * @typedef RequestTargetData
 * @property {string} actor            Actor for whom the request was made.
 * @property {ChatMessage5e} [result]  Chat message indicating the result of the request.
 * @property {User} [user]             Specific user who should handle the request. If not present, then any owner of
 *                                     the actor is able to handle it.
 */

/**
 * @typedef RestMessageData
 * @property {ActivationsData} activations  Activities that can be used after this rest, stored as relative UUIDs.
 * @property {ActorDeltasData} deltas       Actor/item recovery from this turn change.
 * @property {ChatMessage5e} [request]      Rest request chat message for which this rest was performed.
 * @property {string} type                  Type of rest performed.
 */

/**
 * @typedef TurnMessageData
 * @property {ActivationsData} activations  Activities that can be used with these periods, stored as relative UUIDs.
 * @property {ActorDeltasData} deltas       Actor/item recovery from this turn change.
 * @property {object} origin
 * @property {string} origin.combat         ID of the triggering combat.
 * @property {string} origin.combatant      ID of the relevant combatant within the combat.
 * @property {Set<string>} periods          Combat state change that triggered this message.
 */
