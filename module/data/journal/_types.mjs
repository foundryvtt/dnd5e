/**
 * @typedef {ClassJournalPageSystemData}
 * @property {string} item                             UUID of the class item included.
 * @property {object} description
 * @property {string} description.value                Introductory description for the class.
 * @property {string} description.additionalHitPoints  Additional text displayed beneath the hit points section.
 * @property {string} description.additionalTraits     Additional text displayed beneath the traits section.
 * @property {string} description.additionalEquipment  Additional text displayed beneath the equipment section.
 * @property {string} description.subclass             Introduction to the subclass section.
 * @property {string} style                            Force the page style to use modern or legacy formatting, rather
 *                                                     than what is specified by the class.
 * @property {string} subclassHeader                   Subclass header to replace the default.
 * @property {Set<string>} subclassItems               UUIDs of all subclasses to display.
 */

/**
 * @typedef {MapJournalPageSystemData}
 * @property {string} code  Code for the location marker on the map.
 */

/**
 * @typedef {RuleJournalPageSystemData}
 * @property {string} tooltip  Content to display in tooltip in place of page's text content.
 * @property {string} type     Type of rule represented. Should match an entry defined in `CONFIG.DND5E.ruleTypes`.
 */

/**
 * @typedef {SpellsJournalPageSystemData}
 * @property {string} type               Type of spell list (e.g. class, subclass, race, etc.).
 * @property {string} identifier         Common identifier that matches the associated type (e.g. bard, cleric).
 * @property {string} grouping           Default grouping mode.
 * @property {object} description
 * @property {string} description.value  Description to display before spell list.
 * @property {Set<string>} spells        UUIDs of spells to display.
 * @property {UnlinkedSpellConfiguration[]} unlinkedSpells  Unavailable spells that are entered manually.
 */

/**
 * Data needed to display spells that aren't able to be linked (outside SRD & current module).
 *
 * @typedef UnlinkedSpellConfiguration
 * @property {string} _id            Unique ID for this entry.
 * @property {string} identifier     Identifier of this spell.
 * @property {string} name           Name of the spell.
 * @property {object} system
 * @property {number} system.level   Spell level.
 * @property {string} system.school  Spell school.
 * @property {object} source
 * @property {string} source.book    Book/publication where the spell originated.
 * @property {string} source.page    Page or section where the spell can be found.
 * @property {string} source.custom  Fully custom source label.
 * @property {string} source.uuid    UUID of the spell, if available in another module.
 */

/**
 * @typedef {SubclassJournalPageSystemData}
 * @property {string} item               UUID of the subclass item included.
 * @property {object} description
 * @property {string} description.value  Introductory description for the subclass.
 * @property {string} style              Force the page style to use modern or legacy formatting, rather than what
 *                                       is specified by the subclass.
 */
