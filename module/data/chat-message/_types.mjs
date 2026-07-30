/**
 * @import { BastionTurnItem, SaveOutcome } from "../../documents/_types.mjs";
 * @import { ActivationsData, ActorDeltasData } from "./fields/_types.mjs";
 */

/**
 * @typedef AttackMessageSystemData
 * @property {string|null} ability      Ability used for the attack.
 * @property {string|null} ammunition   ID of the ammunition used for the attack.
 * @property {ActorDeltasData} deltas   Snapshots Items consumed & destroyed by the attack.
 * @property {string|null} mastery      Weapon mastery property used for the attack.
 * @property {string|null} mode         Attack mode used for the attack.
 */

/* -------------------------------------------- */

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
 * @typedef CheckMessageSystemData
 * @property {string} ability      Ability used for the check.
 * @property {string|null} skill   Skill used for the check, if any.
 * @property {string|null} tool    Tool used for the check, if any.
 */

/* -------------------------------------------- */

/**
 * @typedef DamageMessageSystemData
 * @property {string|null} onSave  How this damage is affected by a successful save, if it followed one.
 */

/* -------------------------------------------- */

/**
 * @typedef GenericMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef {DamageMessageSystemData} HealingMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef HitDieMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef HitPointsMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef PromptMessageSystemData
 * @property {boolean} broadcast           Whether the prompt is broadcast to the whole table or applies only to the
 *                                         speaker.
 * @property {PromptButtonData[]} buttons  Buttons offering a roll or an action to the user.
 */

/**
 * @typedef {"check"|"concentration"|"endConcentration"|"save"|"skill"|"tool"} PromptButtonType
 */

/**
 * @typedef PromptButtonData
 * @property {string} [ability]                 Ability used for the roll.
 * @property {number} [dc]                      Target value for the roll.
 * @property {"long"|"short"} [format]          Label format style.
 * @property {string} [skill]                   Skill used for the roll.
 * @property {string} [tool]                    Tool used for the roll.
 * @property {PromptButtonType} type            Roll or action performed by this button.
 * @property {string} [usingTool]               Tool used to make a skill check.
 * @property {"all"|"creator"|"gm"} visibility  Which users can see this button.
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
 * @typedef SaveMessageSystemData
 * @property {string} ability            Ability used for the save. Required unless this is a death save.
 * @property {ActorDeltasData} deltas    Actor changes recorded by this save (death saves only).
 * @property {SaveOutcome} outcome       Terminal outcome shown on the card.
 * @property {boolean} resisted          Whether the save was turned into a success by spending a legendary resistance.
 * @property {"ability"|"concentration"|"death"} type  Kind of saving throw this message represents.
 */

/* -------------------------------------------- */

/**
 * @typedef TimePassedMessageSystemData
 * @property {DocumentDeltasData[]} changes  Item recovery from this time change.
 */

/**
 * @typedef DocumentDeltasData
 * @property {ActorDeltasData} deltas  Data deltas for a actor update.
 * @property {string} uuid             UUID of the actor to which the deltas apply.
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

/**
 * @typedef UsageMessageSystemData
 * @property {string} [cause]          Relative ID of the activity that caused this one on the same actor.
 * @property {ActorDeltasData} deltas  Actor/item consumption from this turn change.
 * @property {string[]} effects        Relative or absolute UUIDs of effects that can be applied.
 */
