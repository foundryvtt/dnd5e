/**
 * @typedef SpellcastingModelData
 * @property {string} img                   The icon to use if this spellcasting method is favorited.
 * @property {string} label                 The human-readable label.
 * @property {number} order                 The ordering of this method on an actor sheet's spells tab, ascending.
 * @property {SpellcastingMethodType} type  Types of slots created by this method.
 */

/**
 * "none" - No spell slots.
 * "single" - Spell slots of a single level only.
 * "multi" - Spell slots of multiple levels.
 *
 * @typedef {"none"|"single"|"multi"} SpellcastingMethodType
 */

/**
 * @typedef SlotSpellcastingData
 * @property {boolean} cantrips          Whether this spellcasting method includes cantrips.
 * @property {object} exclusive          Exclusivity options.
 * @property {boolean} exclusive.slots   Whether the slots provided by this spellcasting method may only
 *                                       be used to cast spells that use this spellcasting method.
 * @property {boolean} exclusive.spells  Whether spells that use this spellcasting method may only be cast
 *                                       with slots provided by this spellcasting method.
 * @property {boolean} prepares          Whether spells using this method are variably available for casting.
 *                                       In 2024 this term was unified to 'prepares', but 2014 uses different
 *                                       nomenclature for different classes.
 * @property {Record<string, SlotSpellcastingProgressionData>} progression  Spell slot progressions available for this
 *                                                                          method.
 */

/**
 * @typedef SpellcastingProgression5e
 * @property {number} divisor     How much this progression mode contributes to the base progression of the
 *                                spellcasting method.
 * @property {string} label       The human-readable label.
 * @property {boolean} [roundUp]  Whether to round up or down when determining contribution.
 */

/**
 * @typedef SingleLevelSpellcastingData
 * @property {SpellcastingTableSingle5e} table  The spell slot progression table.
 */

/**
 * @typedef MultiLevelSpellcasting
 * @property {SpellcastingTable5e} table        The spell slot progression table.
 */

/**
 * @typedef {number[][]} SpellcastingTable5e
 */

/**
 * @typedef {Record<number, SpellcastingTableEntry5e>} SpellcastingTableSingle5e
 */

/**
 * @typedef SpellcastingTableEntry5e
 * @property {number} slots  The number of slots available.
 * @property {number} level  The level of the slots.
 */

