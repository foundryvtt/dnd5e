/**
 * @typedef BastionSettingData
 * @property {boolean} button   Display the "Advance Bastion Turn" button in the interface for GM users.
 * @property {number} duration  Time between bastion turns in days.
 * @property {boolean} enabled  Display bastion tab on sheets of characters that are 5th level or higher.
 */

/* -------------------------------------------- */

/**
 * @typedef CalendarConfigSettingData
 * @property {boolean} enabled                       Enable the calendar system for all users.
 * @property {""|"calendar"|"manual"} dailyRecovery  How daily recovery uses are handled. A blank value is automatic
 *                                                   based on the calendar being enabled.
 */

/**
 * @typedef CalendarPreferencesSettingData
 * @property {object} formatters
 * @property {string} formatters.date  Formatter used to display the date (left position).
 * @property {string} formatters.time  Formatter used to display the time (right position).
 * @property {boolean} visible         Display the calendar UI.
 */

/* -------------------------------------------- */

/**
 * @typedef CompendiumSourceConfig5e
 * @property {object} packages
 * @property {CompendiumSourcePackageConfig5e} packages.world
 * @property {CompendiumSourcePackageConfig5e} packages.system
 * @property {Record<string, CompendiumSourcePackageConfig5e>} packages.modules
 * @property {object} packs
 * @property {CompendiumSourcePackGroup5e} packs.items
 * @property {CompendiumSourcePackGroup5e} packs.actors
 */

/**
 * @typedef CompendiumSourcePackageConfig5e
 * @property {string} title           The package title.
 * @property {string} id              The package ID.
 * @property {number} count           The number of packs provided by this package.
 * @property {boolean} checked        True if all the packs are included.
 * @property {boolean} indeterminate  True if only some of the packs are included.
 * @property {boolean} active         True if the package is currently selected.
 * @property {string} filter          The normalized package title for filtering.
 */

/**
 * @typedef CompendiumSourcePackGroup5e
 * @property {boolean} checked        True if all members of this pack group are included.
 * @property {boolean} indeterminate  True if only some of this pack group are included.
 * @property {CompendiumSourcePackConfig5e[]} entries
 */

/**
 * @typedef CompendiumSourcePackConfig5e
 * @property {string} title     The pack title.
 * @property {string} id        The pack ID.
 * @property {boolean} checked  True if the pack is included.
 */

/* -------------------------------------------- */

/**
 * @typedef PrimaryPartySettingData
 * @property {Actor5e} actor  Group actor representing the primary party.
 */

/* -------------------------------------------- */

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
