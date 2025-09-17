/**
 * @import { TransformationConfiguration } from "../../_types.mjs";
 * @import { TokenPlacementData } from "../../canvas/_types.mjs";
 * @import { PseudoDocumentsMetadata } from "../mixins/_types.mjs";
 */

/**
 * Configuration information for Activities.
 *
 * @typedef {PseudoDocumentsMetadata} ActivityMetadata
 * @property {string} type                              Type name of this activity.
 * @property {string} img                               Default icon.
 * @property {string} title                             Default title.
 * @property {string} [hint]                            Hint about how this activity type functions.
 * @property {typeof ActivitySheet} sheetClass          Sheet class used to configure this activity.
 * @property {object} usage
 * @property {Record<string, Function>} usage.actions   Actions that can be triggered from the chat card.
 * @property {string} usage.chatCard                    Template used to render the chat card.
 * @property {typeof ActivityUsageDialog} usage.dialog  Default usage prompt.
 */

/* -------------------------------------------- */

/**
 * Configuration data for an activity usage being prepared.
 *
 * @typedef ActivityUseConfiguration
 * @property {object|false} create
 * @property {boolean} create.measuredTemplate     Should this item create a template?
 * @property {object} concentration
 * @property {boolean} concentration.begin         Should this usage initiate concentration?
 * @property {string|null} concentration.end       ID of an active effect to end concentration on.
 * @property {object|false} consume
 * @property {boolean} consume.action              Should action economy be tracked? Currently only handles
 *                                                 legendary actions.
 * @property {boolean|number[]} consume.resources  Set to `true` or `false` to enable or disable all resource
 *                                                 consumption or provide a list of consumption target indexes
 *                                                 to only enable those targets.
 * @property {boolean} consume.spellSlot           Should this spell consume a spell slot?
 * @property {Event} event                         The browser event which triggered the item usage, if any.
 * @property {boolean|number} scaling              Number of steps above baseline to scale this usage, or `false` if
 *                                                 scaling is not allowed.
 * @property {object} spell
 * @property {number} spell.slot                   The spell slot to consume.
 * @property {boolean} [subsequentActions=true]    Trigger subsequent actions defined by this activity.
 * @property {object} [cause]
 * @property {string} [cause.activity]             Relative UUID to the activity that caused this one to be used.
 *                                                 Activity must be on the same actor as this one.
 * @property {boolean|number[]} [cause.resources]  Control resource consumption on linked item.
 */

/**
 * Data for the activity activation configuration dialog.
 *
 * @typedef ActivityDialogConfiguration
 * @property {boolean} [configure=true]  Display a configuration dialog for the item usage, if applicable?
 * @property {typeof ActivityUsageDialog} [applicationClass]  Alternate activation dialog to use.
 * @property {object} [options]          Options passed through to the dialog.
 */

/**
 * Message configuration for activity usage.
 *
 * @typedef ActivityMessageConfiguration
 * @property {boolean} [create=true]     Whether to automatically create a chat message (if true) or simply return
 *                                       the prepared chat message data (if false).
 * @property {object} [data={}]          Additional data used when creating the message.
 * @property {boolean} [hasConsumption]  Was consumption available during activation.
 * @property {string} [rollMode]         The roll display mode with which to display (or not) the card.
 */

/**
 * @typedef ActivityUsageChatButton
 * @property {string} label    Label to display on the button.
 * @property {string} icon     Icon to display on the button.
 * @property {string} classes  Classes for the button.
 * @property {object} dataset  Data attributes attached to the button.
 */

/**
 * Details of final changes performed by the usage.
 *
 * @typedef ActivityUsageResults
 * @property {ActiveEffect5e[]} effects              Active effects that were created or deleted.
 * @property {ChatMessage5e|object} message          The chat message created for the activation, or the message
 *                                                   data if `create` in ActivityMessageConfiguration was `false`.
 * @property {MeasuredTemplateDocument[]} templates  Created measured templates.
 * @property {ActivityUsageUpdates} updates          Updates to the actor & items.
 */

/**
 * Update data produced by activity usage.
 *
 * @typedef ActivityUsageUpdates
 * @property {object} activity  Updates applied to activity that performed the activation.
 * @property {object} actor     Updates applied to the actor that performed the activation.
 * @property {object[]} create  Full data for Items to create (with IDs maintained).
 * @property {string[]} delete  IDs of items to be deleted from the actor.
 * @property {object[]} item    Updates applied to items on the actor that performed the activation.
 * @property {Roll[]} rolls     Any rolls performed as part of the activation.
 */

/**
 * @typedef ActivityConsumptionDescriptor
 * @property {{ keyPath: string, delta: number }[]} actor                 Changes for the actor.
 * @property {Record<string, { keyPath: string, delta: number }[]>} item  Changes for each item grouped by ID.
 */

/* -------------------------------------------- */

/**
 * @typedef AmmunitionUpdate
 * @property {string} id        ID of the ammunition item to update.
 * @property {boolean} destroy  Will the ammunition item be deleted?
 * @property {number} quantity  New quantity after the ammunition is spent.
 */

/* -------------------------------------------- */

/**
 * @typedef {ActivityUseConfiguration} EnchantUseConfiguration
 * @property {string} enchantmentProfile
 */

/* -------------------------------------------- */

/**
 * @typedef {ActivityUseConfiguration} OrderUseConfiguration
 * @property {object} [building]
 * @property {string} [building.size]            The size of facility to build.
 * @property {object} [costs]
 * @property {number} [costs.days]               The cost of executing the order, in days.
 * @property {number} [costs.gold]               The cost of executing the order, in gold.
 * @property {boolean} [costs.paid]              Whether the gold cost has been paid.
 * @property {object} [craft]
 * @property {string} [craft.item]               The item being crafted or harvested.
 * @property {number} [craft.quantity]           The quantity of items to harvest.
 * @property {object} [trade]
 * @property {boolean} [trade.sell]              Whether the trade was a sell operation.
 * @property {object} [trade.stock]
 * @property {boolean} [trade.stock.stocked]     Whether the order was to fully stock the inventory.
 * @property {boolean} [trade.stock.value]       The base value of goods transacted.
 * @property {object} [trade.creatures]
 * @property {string[]} [trade.creatures.buy]    Additional animals purchased.
 * @property {boolean[]} [trade.creatures.sell]  Whether a creature in a given slot was sold.
 * @property {number} [trade.creatures.price]    The base value of the animals sold.
 */

/* -------------------------------------------- */

/**
 * @typedef {ActivityUseConfiguration} SummonUseConfiguration
 * @property {object|false} create
 * @property {string} create.summons                    Should a summoned creature be created?
 * @property {Partial<SummoningConfiguration>} summons  Options for configuring summoning behavior.
 */

/**
 * Configuration data for summoning behavior.
 *
 * @typedef SummoningConfiguration
 * @property {string} profile         ID of the summoning profile to use.
 * @property {string} [creatureSize]  Selected creature size if multiple are available.
 * @property {string} [creatureType]  Selected creature type if multiple are available.
 */

/**
 * @typedef {ActivityUsageResults} SummonUsageResults
 * @property {Token5e[]} summoned  Summoned tokens.
 */

/**
 * Configuration for creating a modified token.
 *
 * @typedef TokenUpdateData
 * @property {Actor5e} actor                 Original actor from which the token will be created.
 * @property {TokenPlacementData} placement  Information on the location to summon the token.
 * @property {object} tokenUpdates           Additional updates that will be applied to token data.
 * @property {object} actorUpdates           Updates that will be applied to actor delta.
 */

/* -------------------------------------------- */

/**
 * @typedef {ActivityUseConfiguration} TransformUseConfiguration
 * @property {Partial<TransformationUseDetails>} transform  Options for configuring transformation behavior.
 */

/**
 * @typedef TransformationUseDetails
 * @property {string} profile  ID of the transformation profile to use.
 * @property {string} [uuid]   UUID of the creature to transform into.
 */
