/**
 * @import { TargetDescriptor5e } from "../../_types.mjs";
 * @import { ActivityUsageChatButton } from "../../documents/activity/_types.mjs";
 * @import { BastionTurnItem, SaveOutcome } from "../../documents/_types.mjs";
 * @import { ActivationData, DurationData, RangeData, TargetData } from "../shared/_types.mjs";
 * @import { ActivationsData, ActorDeltasData } from "./fields/_types.mjs";
 */

/**
 * @typedef RollMessageSystemData
 * @property {SourceReferenceData|null} activity  Activity that created this message, if any.
 * @property {ItemReferenceData|null} item        Item that created this message, if any.
 * @property {ChatMessage5e|null} origin          The message that spawned this one.
 * @property {TargetDescriptor5e[]} targets       Tokens this message was rolled against.
 */

/* -------------------------------------------- */

/**
 * @typedef {RollMessageSystemData} AttackMessageSystemData
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
 * @typedef BastionOrderMessageSystemData
 * @property {object} costs
 * @property {number|null} costs.days       Cost of executing the order, in days.
 * @property {number|null} costs.gold       Cost of executing the order, in gold.
 * @property {boolean} costs.paid           Whether the gold cost has been paid.
 * @property {object} craft
 * @property {string|null} craft.item       UUID of the item being crafted or harvested.
 * @property {number|null} craft.quantity   Quantity of the item to harvest.
 * @property {string} order                 Order that was issued.
 * @property {object} trade
 * @property {string[]} trade.creatures     UUIDs of the livestock bought or sold by the order.
 * @property {boolean} trade.sell           Whether this was a sell operation rather than a buy.
 * @property {boolean} trade.stocked        Whether the order was to fully stock the facility.
 * @property {number|null} trade.value      Base value of the goods transacted, or the proceeds of a livestock sale.
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
 * @typedef {RollMessageSystemData} CheckMessageSystemData
 * @property {string} ability      Ability used for the check.
 * @property {string|null} skill   Skill used for the check, if any.
 * @property {string|null} tool    Tool used for the check, if any.
 */

/* -------------------------------------------- */

/**
 * @typedef {RollMessageSystemData} DamageMessageSystemData
 * @property {string|null} onSave  How this damage is affected by a successful save, if it followed one.
 */

/* -------------------------------------------- */

/**
 * @typedef {RollMessageSystemData} GenericMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef {DamageMessageSystemData} HealingMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef {RollMessageSystemData} HitDieMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef {RollMessageSystemData} HitPointsMessageSystemData
 */

/* -------------------------------------------- */

/**
 * @typedef ItemMessageSystemData
 * @property {ActivationData|null} activation    How the item is activated, if at all.
 * @property {boolean} concealed                 Whether the description is concealed from players.
 * @property {string} description                Enriched description displayed on the card.
 * @property {DurationData|null} duration        How long the item's effects last.
 * @property {boolean|null} identified           Identified state when the card was created, if applicable.
 * @property {ItemMessageItemData} item          Item the card describes.
 * @property {number|null} level                 Level at which a spell was cast.
 * @property {string} mastery                    Mastery property used with a weapon.
 * @property {string} materials                  Material components required by a spell.
 * @property {ItemMessageProperty[]} properties  Item property descriptors.
 * @property {RangeData|null} range              Item range.
 * @property {string} school                     Spell school.
 * @property {string[]} subtitle                 Localized parts of the card's subtitle.
 * @property {TargetData|null} target            What the item's use targets.
 * @property {TargetDescriptor5e[]} targets      Tokens this message was rolled against.
 */

/**
 * @typedef SourceReferenceData
 * @property {string|null} id    Document ID.
 * @property {string} img        Document image.
 * @property {string} name       Document name.
 * @property {string} type       Document type.
 * @property {string|null} uuid  Document UUID.
 */

/**
 * @typedef {SourceReferenceData} ItemReferenceData
 * @property {string|null} compendiumSource  UUID of the compendium item this item is based on.
 */

/**
 * @typedef {ItemReferenceData} ItemMessageItemData
 * @property {Set<string>} properties  The item's own property keys.
 */

/**
 * @typedef ItemMessageProperty
 * @property {string} type  Kind of property, which determines how it is rendered and what other data it carries.
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
 * @typedef {RollMessageSystemData} SaveMessageSystemData
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
 * @typedef {ItemMessageSystemData} UsageMessageSystemData
 * @property {UsageMessageActivityData} activity  Activity that was used.
 * @property {ActivityUsageChatButton[]} buttons  Buttons offered by the activity that created this message.
 * @property {string} [cause]                     Relative ID of the activity that caused this one on the same actor.
 * @property {ActorDeltasData} deltas             Actor/item consumption from this turn change.
 * @property {string[]} effects                   Relative or absolute UUIDs of effects that can be applied.
 */

/**
 * @typedef {SourceReferenceData} UsageMessageActivityData
 * @property {string} chatFlavor  Flavor text displayed in place of the card's subtitle.
 */
