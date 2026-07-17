/**
 * @import {
 *   D20RollModificationData, DamageRollModificationData, MovementData, RollConfigData, SensesData
 * } from "../../shared/_types.mjs";
 * @import { ACFormulaData, DamageTraitData, SimpleTraitData } from "../fields/_types.mjs";
 */

/**
 * @typedef AttributesCommonData
 * @property {ArmorClassData} ac       Armor class configuration.
 * @property {RollConfigData} init
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
 * @property {number} concentration.limit         The amount of items this actor can concentrate on.
 * @property {object} loyalty
 * @property {number} loyalty.value               The creature's loyalty score.
 */

/**
 * @typedef ArmorClassData
 * @property {number} armor              AC value provided by equipped armor (not persisted).
 * @property {number} base               Base AC value originating from the formula (not persisted).
 * @property {string} bonus              Bonus AC provided by active effects (not persisted).
 * @property {string} calc               Name of one of the built-in formulas being used or "custom" (not persisted).
 * @property {Set<string>} calcs         Which of the base AC calculation formulas defined by the system should be
 *                                       usable.
 * @property {number} cover              Bonus AC provided by the cover status effect (not persisted).
 * @property {number} flat               Flat value usable by any armor class calculation.
 * @property {string} formula            Extra formula added by legacy active effects (not persisted).
 * @property {ACFormulaData[]} formulas  Available armor class formulas, the highest of which is used.
 * @property {string} min                Minimum armor class value after all bonuses have been added (not persisted).
 * @property {number} override           Unmodifiable armor class value that supersedes any entered formulas.
 * @property {number} shield             AC value provided by equipped shield (not persisted).
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
 * @property {Omit<RollConfigData, "ability">} check  Properties related to ability checks.
 * @property {Omit<RollConfigData, "ability">} save   Properties related to saving throws.
 */

/**
 * @typedef {CommonTemplateData} CreatureTemplateData
 * @property {object} bonuses
 * @property {object} bonuses.spell                  Bonuses to spells.
 * @property {string} bonuses.spell.dc               Numeric bonus to spellcasting DC.
 * @property {object} rolls
 * @property {object} rolls.ability
 * @property {ProficientRollModificationData} rolls.ability.check  Modifications to ability checks.
 * @property {ProficientRollModificationData} rolls.ability.save   Modifications to ability saves.
 * @property {ProficientRollModificationData} rolls.ability.skill  Modifications to skill checks.
 * @property {ProficientRollModificationData} rolls.ability.tool   Modifications to tool checks.
 * @property {D20RollModificationData} rolls.attack       Modifications to attack rolls.
 * @property {D20RollModificationData} rolls.attack.msak  Modifications to melee spell attack rolls.
 * @property {D20RollModificationData} rolls.attack.mwak  Modifications to melee weapon attack rolls.
 * @property {D20RollModificationData} rolls.attack.rsak  Modifications to ranged spell attack rolls.
 * @property {D20RollModificationData} rolls.attack.rwak  Modifications to ranged weapon attack rolls.
 * @property {object} rolls.damage
 * @property {DamageRollModificationData} rolls.damage.msak  Damage bonuses to melee spell attacks.
 * @property {DamageRollModificationData} rolls.damage.mwak  Damage bonuses to melee weapon attacks.
 * @property {DamageRollModificationData} rolls.damage.rsak  Damage bonuses to ranged spell attacks.
 * @property {DamageRollModificationData} rolls.damage.rwak  Damage bonuses to ranged weapon attacks.
 * @property {Record<string, ToolData>} tools        Actor's tools.
 * @property {Record<string, SkillData>} skills      Actor's skills.
 * @property {Record<string, SpellSlotData>} spells  Actor's spell slots.
 */

/**
 * @typedef {D20RollModificationData} ProficientRollModificationData
 * @property {number} proficiency  Minimum proficiency level for this roll.
 */

/**
 * @typedef {RollConfigData} SkillData
 * @property {number} value            Proficiency level creature has in this skill.
 * @property {object} bonuses          Bonuses for this skill.
 * @property {string} bonuses.passive  Numeric bonus to skill's passive check.
 */

/**
 * @typedef {RollConfigData} ToolData
 * @property {number} value            Proficiency level creature has in this tool.
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
