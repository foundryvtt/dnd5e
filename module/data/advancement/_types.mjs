/**
 * @typedef AbilityScoreImprovementAdvancementConfigurationData
 * @property {number} cap                    Maximum number of points that can be assigned to a single score.
 * @property {Object<string, number>} fixed  Number of points automatically assigned to a certain score.
 * @property {Set<string>} locked            Abilities that cannot be changed by this advancement.
 * @property {number} max                    Override for the maximum ability score.
 * @property {number} points                 Number of points that can be assigned to any score.
 * @property {string} recommendation         Epic Boon feat recommended by this class.
 */

/**
 * @typedef AbilityScoreImprovementAdvancementValueData
 * @property {string} type             When on a class, whether the player chose ASI or a Feat.
 * @property {Object<string, number>}  Points assigned to individual scores.
 * @property {Object<string, string>}  Feat that was selected.
 */

/**
 * @typedef AdvancementData
 * @property {string} _id               The advancement's ID.
 * @property {string} type              Type of advancement.
 * @property {*} configuration          Type-specific configuration data.
 * @property {*} value                  Type-specific value data after the advancement is applied.
 * @property {number} level             For single-level advancement, the level at which it should apply.
 * @property {string} title             Optional custom title.
 * @property {string} hint              Brief description of what the advancement does or guidance for the player.
 * @property {string} icon              Optional custom icon.
 * @property {string} classRestriction  Should this advancement apply at all times, only when on the first class on
 *                                      an actor, or only on a class that is multi-classing?
 */

/**
 * @typedef ItemChoiceAdvancementConfigurationData
 * @property {boolean} allowDrops                             Should players be able to drop non-listed items?
 * @property {Record<number, ItemChoiceLevelConfig>} choices  Choices & config for specific levels.
 * @property {ItemChoicePoolEntry[]} pool                     Items that can be chosen.
 * @property {object} restriction
 * @property {"available"|number} restriction.level           Level of spell allowed.
 * @property {Set<string>} restriction.list                   Spell lists from which a spell must be selected.
 * @property {string} restriction.subtype                     Item sub-type allowed.
 * @property {string} restriction.type                        Specific item type allowed.
 * @property {AdvancementSpellConfigurationData} spell        Mutations applied to spell items.
 * @property {string} type                                    Type of item allowed, if it should be restricted.
 */

/**
 * @typedef ItemChoiceLevelConfig
 * @property {number} count         Number of items a player can select at this level.
 * @property {boolean} replacement  Can a player replace previous selections at this level?
 */

/**
 * @typedef ItemChoicePoolEntry
 * @property {string} uuid  UUID of the item to present as a choice.
 */

/**
 * @typedef ItemChoiceAdvancementValueData
 * @property {string} ability                                  Ability selected for the spells.
 * @property {Record<number, Record<string, string>>} added    Mapping of IDs to UUIDs for items added at each level.
 * @property {Record<number, ItemChoiceReplacement>} replaced  Information on items replaced at each level.
 */

/**
 * @typedef ItemChoiceReplacement
 * @property {number} level        Level at which the original item was chosen.
 * @property {string} original     ID of the original item that was replaced.
 * @property {string} replacement  ID of the replacement item.
 */

/**
 * @typedef ItemGrantAdvancementConfigurationData
 * @property {ItemGrantItemConfiguration[]} items       Data for the items to be granted.
 * @property {boolean} optional                         Should user be able to de-select any individual option?
 * @property {AdvancementSpellConfigurationData} spell  Data used to modify any granted spells.
 */

/**
 * @typedef ItemGrantItemConfiguration
 * @property {string} uuid       UUID of the item to grant.
 * @property {boolean} optional  Is this item optional? Has no effect if whole advancement is optional.
 */

/**
 * @typedef ScaleValueAdvancementConfigurationData
 * @property {string} identifier             Identifier used to select this scale value in roll formulas.
 * @property {string} type                   Type of data represented by this scale value.
 * @property {object} [distance]
 * @property {string} [distance.units]       If distance type is selected, the units each value uses.
 * @property {Object<string, object>} scale  Sparse scale values for each level.
 */

/**
 * @typedef ScaleValueDiceTypeData
 * @property {number} number          Number of dice.
 * @property {number} faces           Die faces.
 * @property {Set<string>} modifiers  Die modifiers attached to roll.
 */

/**
 * @typedef ScaleValueNumberTypeData
 * @property {number} value           Numeric value.
 */

/**
 * @typedef ScaleValueStringTypeData
 * @property {string} value           String value.
 */

/**
 * Information on how a scale value of this type is configured.
 *
 * @typedef ScaleValueTypeMetadata
 * @property {string} label       Name of this type.
 * @property {string} hint        Hint for this type shown in the scale value configuration.
 * @property {string} identifier  Hint for the identifier for this type.
 * @property {boolean} isNumeric  When using the default editing interface, should numeric inputs be used?
 */

/**
 * @typedef SizeAdvancementConfigurationData
 * @property {Set<string>} sizes  Sizes that can be selected.
 */

/**
 * @typedef SizeAdvancementValueData
 * @property {string} size  Selected size.
 */

/**
 * @typedef AdvancementSpellConfigurationData
 * @property {Set<string>} ability       Abilities that can be selected.
 * @property {string} method             Spellcasting method.
 * @property {number} prepared           Preparation mode for the spell.
 * @property {object} uses
 * @property {string} uses.max           Formula for maximum uses.
 * @property {string} uses.per           Recovery period for limited uses.
 * @property {boolean} uses.requireSlot  Require a spell slot in addition to limited uses.
 */

/**
 * @typedef SubclassAdvancementValueData
 * @property {Item5e} document  Copy of the subclass on the actor.
 * @property {string} uuid      UUID of the remote subclass source.
 */

/**
 * @typedef TraitAdvancementConfigurationData
 * @property {boolean} allowReplacements  Whether all potential choices should be presented to the user if there
 *                                        are no more choices available in a more limited set.
 * @property {TraitChoice[]} choices      Choices presented to the user.
 * @property {string[]} grants            Keys for traits granted automatically.
 * @property {string} mode                Method by which this advancement modifies the actor's traits.
 */

/**
 * @typedef {object} TraitChoice
 * @property {number} count     Number of traits that can be selected.
 * @property {string[]} [pool]  List of trait or category keys that can be chosen. If no choices are provided,
 *                              any trait of the specified type can be selected.
 */

/**
 * @typedef TraitAdvancementValueData
 * @property {Set<string>} chosen  Trait keys that have been chosen.
 */
