/**
 * @import { SpellScrollValues } from "../_types.mjs";
 * @import { ActorUpdatesDescription } from "../data/chat-message/fields/_types.mjs";
 */

/**
 * @typedef BastionTurnResult
 * @property {string} [order]             The order that was completed, if any.
 * @property {number} [gold]              Gold generated.
 * @property {BastionTurnItem[]} [items]  Items created.
 */

/**
 * @typedef BastionTurnItem
 * @property {string} uuid      The UUID of the generated Item.
 * @property {number} quantity  The quantity of items generated.
 */

/* -------------------------------------------- */

/**
 * @typedef {ActorUpdatesDescription} CombatRecoveryResults
 * @property {BasicRoll[]} rolls  Any recovery rolls performed.
 */

/* -------------------------------------------- */

/**
 * Description of a source of damage.
 *
 * @typedef DamageDescription
 * @property {number} value                          Amount of damage.
 * @property {string} type                           Type of damage.
 * @property {Set<string>} properties                Physical properties that affect damage application.
 * @property {object} [active]
 * @property {DamageAffectDescription} [active.all]  How resistance/etc. targeting All Damage affected this total.
 * @property {number} [active.multiplier]            Final calculated multiplier.
 * @property {boolean} [active.threshold]            Did threshold affect this description?
 * @property {DamageAffectDescription} [active.type] How resistance/etc. targeting this type affected this total.
 */

/**
 * @typedef DamageAffectDescription
 * @property {boolean} [modification]   Did modification affect this description?
 * @property {boolean} [resistance]     Did resistance affect this description?
 * @property {boolean} [vulnerability]  Did vulnerability affect this description?
 * @property {boolean} [immunity]       Did immunity affect this description?
 */

/**
 * Options for damage application.
 *
 * @typedef DamageApplicationOptions
 * @property {boolean|Set<string>} [downgrade]  Should this actor's resistances and immunities be downgraded by one
 *                                              step? A set of damage types to be downgraded or `true` to downgrade
 *                                              all damage types.
 * @property {number} [multiplier=1]         Amount by which to multiply all damage.
 * @property {object|boolean} [ignore]       Set to `true` to ignore all damage modifiers. If set to an object, then
 *                                           values can either be `true` to indicate that the all modifications of
 *                                           that type should be ignored, or a set of specific damage types for which
 *                                           it should be ignored.
 * @property {boolean|Set<string>} [ignore.immunity]       Should this actor's damage immunity be ignored?
 * @property {boolean|Set<string>} [ignore.resistance]     Should this actor's damage resistance be ignored?
 * @property {boolean|Set<string>} [ignore.vulnerability]  Should this actor's damage vulnerability be ignored?
 * @property {boolean|Set<string>} [ignore.modification]   Should this actor's damage modification be ignored?
 * @property {boolean} [ignore.threshold]                  Should this actor's damage threshold be ignored?
 * @property {boolean} [invertHealing=true]  Automatically invert healing types to it heals, rather than damages.
 * @property {"damage"|"healing"} [only]     Apply only damage or healing parts. Untyped rolls will always be applied.
 * @property {boolean} [isDelta]             Whether the damage is coming from a relative change.
 * @property {ChatMessage5e} [originatingMessage]          The associated chat message.
 */

/**
 * @typedef {Array<DamageDescription>} DamageSummary
 * @property {number} amount  Total amount of damage/healing across all damage types.
 * @property {number} temp    Total amount of temp HP across all damage types.
 */

/* -------------------------------------------- */

/**
 * @callback ItemContentsTransformer
 * @param {Item5e|object} item        Data for the item to transform.
 * @param {object} options
 * @param {string} options.container  ID of the container to create the items.
 * @param {number} options.depth      Current depth of the item being created.
 * @returns {Item5e|object|void}
 */

/* -------------------------------------------- */

/**
 * Configuration options for a rest.
 *
 * @typedef RestConfiguration
 * @property {string} type                   Type of rest to perform.
 * @property {boolean} dialog                Present a dialog window which allows for rolling hit dice as part of the
 *                                           Short Rest and selecting whether a new day has occurred.
 * @property {boolean} chat                  Should a chat message be created to summarize the results of the rest?
 * @property {number} duration               Amount of time passed during the rest in minutes.
 * @property {boolean} newDay                Does this rest carry over to a new day?
 * @property {boolean} [advanceBastionTurn]  Should a bastion turn be advanced for all players?
 * @property {boolean} [advanceTime]         Should the game clock be advanced by the rest duration?
 * @property {boolean} [autoHD]              Should hit dice be spent automatically during a short rest?
 * @property {number} [autoHDThreshold]      How many hit points should be missing before hit dice are
 *                                           automatically spent during a short rest.
 * @property {boolean} [recoverTemp]         Reset temp HP to zero.
 * @property {boolean} [recoverTempMax]      Reset temp max HP to zero.
 * @property {number} [exhaustionDelta]      A delta exhaustion to apply to creatures undergoing this rest.
 * @property {ChatMessage5e} [request]       Rest request chat message for which this rest was performed.
 */

/**
 * Results from a rest operation.
 *
 * @typedef RestResult
 * @property {string} type              Type of rest performed.
 * @property {Actor5e} clone            Clone of the actor before rest is performed.
 * @property {string[]} deleteItems     IDs of items to be deleted from the actor.
 * @property {object} deltas
 * @property {number} deltas.hitPoints  Hit points recovered during the rest.
 * @property {number} deltas.hitDice    Hit dice recovered or spent during the rest.
 * @property {ChatMessage5e} [message]  The created chat message.
 * @property {boolean} newDay           Whether a new day occurred during the rest.
 * @property {Roll[]} rolls             Any rolls that occurred during the rest process, not including hit dice.
 * @property {object} updateData        Updates applied to the actor.
 * @property {object[]} updateItems     Updates applied to actor's items.
 */

/* -------------------------------------------- */

/**
 * Object representing a nested set of choices to be displayed in a grouped select list or a trait selector.
 *
 * @typedef SelectChoicesEntry
 * @property {string} label              Label, either pre- or post-localized.
 * @property {boolean} [chosen]          Has this choice been selected?
 * @property {boolean} [sorting=true]    Should this value be sorted? If there are a mixture of this value at
 *                                       a level, unsorted values are listed first followed by sorted values.
 * @property {SelectChoices} [children]  Nested choices. If wildcard filtering support is desired, then trait keys
 *                                       should be provided prefixed for children (e.g. `parent:child`, rather than
 *                                       just `child`).
 */

/* -------------------------------------------- */

/**
 * Spellcasting details for a class or subclass.
 *
 * @typedef SpellcastingDescription
 * @property {string} type              Spellcasting method as defined in `CONFIG.DND5E.spellcasting`.
 * @property {string|null} progression  Progression within the specified spellcasting type if supported.
 * @property {string} ability           Ability used when casting spells from this class or subclass.
 * @property {number|null} levels       Number of levels of this class or subclass's class if embedded.
 */

/* -------------------------------------------- */

/**
 * Configuration options for spell scroll creation.
 *
 * @typedef SpellScrollConfiguration
 * @property {boolean} [dialog=true]                           Present scroll creation dialog?
 * @property {"full"|"reference"|"none"} [explanation="full"]  Length of spell scroll rules text to include.
 * @property {number} [level]                                  Level at which the spell should be cast.
 * @property {Partial<SpellScrollValues>} [values]             Spell scroll DC and attack bonus.
 */
