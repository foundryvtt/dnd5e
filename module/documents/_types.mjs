/**
 * @import { SpellScrollValues } from "../_types.mjs";
 */

/**
 * @typedef CombatRecoveryResults
 * @property {object} actor       Updates to be applied to the actor.
 * @property {object[]} item      Updates to be applied to the actor's items.
 * @property {BasicRoll[]} rolls  Any recovery rolls performed.
 */

/**
 * @callback ItemContentsTransformer
 * @param {Item5e|object} item        Data for the item to transform.
 * @param {object} options
 * @param {string} options.container  ID of the container to create the items.
 * @param {number} options.depth      Current depth of the item being created.
 * @returns {Item5e|object|void}
 */

/**
 * Spellcasting details for a class or subclass.
 *
 * @typedef SpellcastingDescription
 * @property {string} type              Spellcasting method as defined in `CONFIG.DND5E.spellcasting`.
 * @property {string|null} progression  Progression within the specified spellcasting type if supported.
 * @property {string} ability           Ability used when casting spells from this class or subclass.
 * @property {number|null} levels       Number of levels of this class or subclass's class if embedded.
 */

/**
 * Configuration options for spell scroll creation.
 *
 * @typedef SpellScrollConfiguration
 * @property {boolean} [dialog=true]                           Present scroll creation dialog?
 * @property {"full"|"reference"|"none"} [explanation="full"]  Length of spell scroll rules text to include.
 * @property {number} [level]                                  Level at which the spell should be cast.
 * @property {Partial<SpellScrollValues>} [values]             Spell scroll DC and attack bonus.
 */
