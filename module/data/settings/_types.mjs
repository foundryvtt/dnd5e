/**
 * @typedef BastionSettingData
 * @property {boolean} button   Display the "Advance Bastion Turn" button in the interface for GM users.
 * @property {number} duration  Time between bastion turns in days.
 * @property {boolean} enabled  Display bastion tab on sheets of characters that are 5th level or higher.
 */

/**
 * @typedef PrimaryPartySettingData
 * @property {Actor5e} actor  Group actor representing the primary party.
 */

/**
 * @typedef TransformationSettingData
 * @property {Set<string>} effects
 * @property {Set<string>} keep
 * @property {Set<string>} merge
 * @property {string} [minimumAC]         Formula for minimum armor class for transformed creature.
 * @property {Set<string>} other
 * @property {string} [preset]
 * @property {Set<string>} [spellLists]   Spell lists to keep if actor has matching item.
 * @property {string} [tempFormula]       Formula for temp HP that will be added during transformation.
 * @property {boolean} [transformTokens]
 */
