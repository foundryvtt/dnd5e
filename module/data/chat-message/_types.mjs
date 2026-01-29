/**
 * @import { BastionTurnItem } from "../../documents/_types.mjs";
 * @import { ActivationsData, ActorDeltasData } from "./fields/_types.mjs";
 */

/**
 * @typedef BastionAttackMessageSystemData
 * @property {string|null} damaged  Facility that was damage by the attack.
 * @property {number} [deaths]      Number of defenders killed in the attack.
 * @property {boolean} resolved     Have the effects of the attack been fully resolved?
 * @property {boolean} undefended   Was the bastion undefended when it was attacked?
 */

/* -------------------------------------------- */

/**
 * @typedef BastionTurnMessageSystemData
 * @property {object} gold
 * @property {boolean} gold.claimed  Has this gold been claimed by the actor?
 * @property {number} gold.value     Amount of gold produced by this turn.
 * @property {BastionTurnItem[]} items
 * @property {BastionTurnOrder[]} orders
 */

/**
 * @typedef BastionTurnOrder
 * @property {string} id     ID of the facility that was issued the order.
 * @property {string} order  Order that was issued.
 */

/* -------------------------------------------- */

/**
 * @typedef RequestMessageSystemData
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

/* -------------------------------------------- */

/**
 * @typedef RestMessageSystemData
 * @property {ActivationsData} activations  Activities that can be used after this rest, stored as relative UUIDs.
 * @property {ActorDeltasData} deltas       Actor/item recovery from this turn change.
 * @property {ChatMessage5e} [request]      Rest request chat message for which this rest was performed.
 * @property {string} type                  Type of rest performed.
 */

/* -------------------------------------------- */

/**
 * @typedef TurnMessageSystemData
 * @property {ActivationsData} activations  Activities that can be used with these periods, stored as relative UUIDs.
 * @property {ActorDeltasData} deltas       Actor/item recovery from this turn change.
 * @property {object} origin
 * @property {string} origin.combat         ID of the triggering combat.
 * @property {string} origin.combatant      ID of the relevant combatant within the combat.
 * @property {Set<string>} periods          Combat state change that triggered this message.
 */
