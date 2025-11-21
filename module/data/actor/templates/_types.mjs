/**
 * @import { MovementData, RollConfigData, SensesData } from "../../shared/_types.mjs";
 * @import { DamageTraitData, SimpleTraitData } from "../fields/_types.mjs";
 */

/**
 * @typedef AttributesCommonData
 * @property {ArmorClassData} ac       Armor class configuration.
 * @property {RollConfigData} init
 * @property {string} init.ability     The ability used for initiative rolls.
 * @property {string} init.bonus       The bonus provided to initiative rolls.
 * @property {MovementData} movement
 */

/**
 * @typedef AttributesCreatureData
 * @property {object} attunement
 * @property {number} attunement.max              Maximum number of attuned items.
 * @property {SensesData} senses
 * @property {string} spellcasting                Primary spellcasting ability.
 * @property {number} exhaustion                  Creature's exhaustion level.
 * @property {RollConfigData} concentration
 * @property {string} concentration.ability       The ability used for concentration saving throws.
 * @property {object} concentration.bonuses
 * @property {string} concentration.bonuses.save  The bonus provided to concentration saving throws.
 * @property {number} concentration.limit         The amount of items this actor can concentrate on.
 * @property {object} loyalty
 * @property {number} loyalty.value               The creature's loyalty score.
 */

/**
 * @typedef ArmorClassData
 * @property {string} calc     Name of one of the built-in formulas to use.
 * @property {number} flat     Flat value used for flat or natural armor calculation.
 * @property {string} formula  Custom formula to use.
 */

/**
 * @typedef HitPointsData
 * @property {number} dt       Damage threshold.
 * @property {number} max      Maximum allowed HP value.
 * @property {number} temp     Temporary HP applied on top of value.
 * @property {number} tempmax  Temporary change to the maximum HP.
 * @property {number} value    Current hit points.
 */

/**
 * @typedef CommonTemplateData
 * @property {Object<string, AbilityData>} abilities  Actor's abilities.
 */

/**
 * @typedef AbilityData
 * @property {number} value          Ability score.
 * @property {number} proficient     Proficiency value for saves.
 * @property {number} max            Maximum possible score for the ability.
 * @property {object} bonuses        Bonuses that modify ability checks and saves.
 * @property {string} bonuses.check  Numeric or dice bonus to ability checks.
 * @property {string} bonuses.save   Numeric or dice bonus to ability saving throws.
 * @property {RollConfigData} check    Properties related to ability checks.
 * @property {RollConfigData} save     Properties related to saving throws.
 */

/**
 * @typedef {CommonTemplateData} CreatureTemplateData
 * @property {object} bonuses
 * @property {AttackBonusesData} bonuses.mwak        Bonuses to melee weapon attacks.
 * @property {AttackBonusesData} bonuses.rwak        Bonuses to ranged weapon attacks.
 * @property {AttackBonusesData} bonuses.msak        Bonuses to melee spell attacks.
 * @property {AttackBonusesData} bonuses.rsak        Bonuses to ranged spell attacks.
 * @property {object} bonuses.abilities              Bonuses to ability scores.
 * @property {string} bonuses.abilities.check        Numeric or dice bonus to ability checks.
 * @property {string} bonuses.abilities.save         Numeric or dice bonus to ability saves.
 * @property {string} bonuses.abilities.skill        Numeric or dice bonus to skill checks.
 * @property {object} bonuses.spell                  Bonuses to spells.
 * @property {string} bonuses.spell.dc               Numeric bonus to spellcasting DC.
 * @property {Record<string, ToolData>} tools        Actor's tools.
 * @property {Record<string, SkillData>} skills      Actor's skills.
 * @property {Record<string, SpellSlotData>} spells  Actor's spell slots.
 */

/**
 * @typedef AttackBonusesData
 * @property {string} attack  Numeric or dice bonus to attack rolls.
 * @property {string} damage  Numeric or dice bonus to damage rolls.
 */

/**
 * @typedef {RollConfigData} SkillData
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.check    Numeric or dice bonus to skill's check.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */

/**
 * @typedef {RollConfigData} ToolData
 * @property {number} value            Proficiency level creature has in this tool.
 * @property {object} bonuses          Bonuses for this tool.
 * @property {string} bonuses.check    Numeric or dice bonus to tool's check.
 */

/**
 * @typedef SpellSlotData
 * @property {number} value     Currently available spell slots.
 * @property {number} override  Number to replace auto-calculated max slots.
 */

/**
 * @typedef DetailsCommonData
 * @property {object} biography         Actor's biography data.
 * @property {string} biography.value   Full HTML biography information.
 * @property {string} biography.public  Biography that will be displayed to players with observer privileges.
 */

/**
 * @typedef DetailsCreatureData
 * @property {string} alignment    Creature's alignment.
 * @property {string} ideal        Creature's ideals.
 * @property {string} bond         Creature's bonds.
 * @property {string} flaw         Creature's flaws.
 * @property {Item5e|string} race  Creature's race item or name.
 */

/**
 * @typedef GroupTemplateData
 * @property {object} description
 * @property {string} description.full           Description of this group.
 * @property {string} description.summary        Summary description (currently unused).
 */

/**
 * @typedef TraitsCommonData
 * @property {string} size                Actor's size.
 * @property {DamageTraitData} di         Damage immunities.
 * @property {DamageTraitData} dr         Damage resistances.
 * @property {DamageTraitData} dv         Damage vulnerabilities.
 * @property {DamageModificationData} dm  Damage modification.
 * @property {SimpleTraitData} ci         Condition immunities.
 */

/**
 * @typedef TraitsCreatureData
 * @property {LanguageTraitData} languages  Languages known by this creature.
 */

/**
 * @typedef DamageModificationData
 * @property {Record<string, string>} amount  Damage boost or reduction by damage type.
 * @property {Set<string>} bypasses           Keys for physical properties that cause modification to be bypassed.
 */

/**
 * @typedef {SimpleTraitData} LanguageTraitData
 * @property {Record<string, CommunicationData>} communication  Measured communication ranges (e.g. telepathy).
 */

/**
 * @typedef LanguageCommunicationData
 * @property {string} units  Units used to measure range.
 * @property {number} value  Range to which this ability can be used.
 */
