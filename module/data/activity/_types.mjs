/**
 * @import { TransformationSettingData } from "../settings/transformation-setting.mjs";
 * @import { ActivationData, DamageData, DurationData, RangeData, TargetData, UsesData } from "../shared/_types.mjs";
 * @import { ConsumptionTargetData, EffectApplicationData } from "./fields/_types.mjs";
 */

/**
 * @typedef ActivityData
 * @property {string} _id                        Unique ID for the activity on an item.
 * @property {string} type                       Type name of the activity used to build a specific activity class.
 * @property {string} name                       Name for this activity.
 * @property {string} img                        Image that represents this activity.
 * @property {number} sort                       Sorting position of the activity on an item.
 * @property {ActivationData} activation         Activation time & conditions.
 * @property {boolean} activation.override       Override activation values inferred from item.
 * @property {object} consumption
 * @property {object} consumption.scaling
 * @property {boolean} consumption.scaling.allowed          Can this non-spell activity be activated at higher levels?
 * @property {string} consumption.scaling.max               Maximum number of scaling levels for this item.
 * @property {boolean} consumption.spellSlot                If this is on a spell, should it consume a spell slot?
 * @property {ConsumptionTargetData[]} consumption.targets  Collection of consumption targets.
 * @property {object} description
 * @property {string} description.chatFlavor     Extra text displayed in the activation chat message.
 * @property {DurationData} duration             Duration of the effect.
 * @property {boolean} duration.concentration    Does this effect require concentration?
 * @property {boolean} duration.override         Override duration values inferred from item.
 * @property {EffectApplicationData[]} effects   Linked effects that can be applied.
 * @property {Record<string, object>} flags      Arbitrary flag data for this activity.
 * @property {RangeData} range
 * @property {boolean} range.override            Override range values inferred from item.
 * @property {TargetData} target
 * @property {boolean} target.override           Override target values inferred from item.
 * @property {boolean} target.prompt             Should the player be prompted to place the template?
 * @property {UsesData} uses                     Uses available to this activity.
 */

/**
 * @typedef {ActivityData} AttackActivityData
 * @property {object} attack
 * @property {string} attack.ability              Ability used to make the attack and determine damage.
 * @property {string} attack.bonus                Arbitrary bonus added to the attack.
 * @property {object} attack.critical
 * @property {number} attack.critical.threshold   Minimum value on the D20 needed to roll a critical hit.
 * @property {boolean} attack.flat                Should the bonus be used in place of proficiency & ability modifier?
 * @property {object} attack.type
 * @property {string} attack.type.value           Is this a melee or ranged attack?
 * @property {string} attack.type.classification  Is this a unarmed, weapon, or spell attack?
 * @property {object} damage
 * @property {object} damage.critical
 * @property {string} damage.critical.bonus       Extra damage applied when a critical is rolled. Added to the base
 *                                                damage or first damage part.
 * @property {boolean} damage.includeBase         Should damage defined by the item be included with other damage parts?
 * @property {DamageData[]} damage.parts          Parts of damage to inflict.
 */

/**
 * @typedef {Omit<ActivityData, "effects">} CastActivityData
 * @property {object} spell
 * @property {string} spell.ability              Ability to override default spellcasting ability.
 * @property {object} spell.challenge
 * @property {number} spell.challenge.attack     Flat to hit bonus in place of the spell's normal attack bonus.
 * @property {number} spell.challenge.save       Flat DC to use in place of the spell's normal save DC.
 * @property {boolean} spell.challenge.override  Use custom attack bonus & DC rather than creature's.
 * @property {number} spell.level                Base level at which to cast the spell.
 * @property {Set<string>} spell.properties      Spell components & tags to ignore while casting.
 * @property {boolean} spell.spellbook           Display spell in the Spells tab of the character sheet.
 * @property {string} spell.uuid                 UUID of the spell to cast.
 */

/**
 * @typedef {ActivityData} CheckActivityData
 * @property {object} check
 * @property {string} check.ability          Ability used with the check.
 * @property {Set<string>} check.associated  Skills or tools that can contribute to the check.
 * @property {object} check.dc
 * @property {string} check.dc.calculation   Method or ability used to calculate the difficulty class of the check.
 * @property {string} check.dc.formula       Custom DC formula or flat value.
 */

/**
 * @typedef {ActivityData} DamageActivityData
 * @property {object} damage
 * @property {boolean} damage.critical.allow  Can this damage be critical?
 * @property {string} damage.critical.bonus   Extra damage applied to the first damage part when a critical is rolled.
 * @property {DamageData[]} damage.parts      Parts of damage to inflict.
 */

/**
 * @typedef {ActivityData} EnchantActivityData
 * @property {object} enchant
 * @property {string} enchant.identifier    Class identifier that will be used to determine applicable level.
 * @property {string} enchant.self          Automatically apply enchantment to item containing this activity when used.
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical    Allow enchantments to be applied to items that are already magical.
 * @property {Set<string>} restrictions.categories  Item categories to restrict to.
 * @property {Set<string>} restrictions.properties  Item properties to restrict to.
 * @property {string} restrictions.type             Item type to which this enchantment can be applied.
 */

/**
 * @typedef {EffectApplicationData} EnchantEffectApplicationData
 * @property {object} level
 * @property {number} level.min             Minimum level at which this profile can be used.
 * @property {number} level.max             Maximum level at which this profile can be used.
 * @property {object} riders
 * @property {Set<string>} riders.activity  IDs of other activities on this item that will be added when enchanting.
 * @property {Set<string>} riders.effect    IDs of other effects on this item that will be added when enchanting.
 * @property {Set<string>} riders.item      UUIDs of items that will be added with this enchantment.
 */

/**
 * @typedef {Omit<ActivityData, "duration"|"effects"|"range"|"target">} ForwardActivityData
 * @property {object} activity
 * @property {string} activity.id  ID of the activity to forward to.
 */

/**
 * @typedef {ActivityData} HealActivityData
 * @property {DamageData} healing
 */

/**
 * @typedef OrderActivityData
 * @property {string} _id    Unique ID for the activity on an item.
 * @property {string} type   Type name of the activity used to build a specific activity class.
 * @property {string} name   Name for this activity.
 * @property {string} img    Image that represents this activity.
 * @property {string} order  The issued order.
 */

/**
 * @typedef {ActivityData} SaveActivityData
 * @property {object} damage
 * @property {string} damage.onSave                 How much damage is done on a successful save?
 * @property {DamageData[]} damage.parts            Parts of damage to inflict.
 * @property {SaveEffectApplicationData[]} effects  Linked effects that can be applied.
 * @property {object} save
 * @property {Set<string>} save.ability             Make the saving throw with one of these abilities.
 * @property {object} save.dc
 * @property {string} save.dc.calculation           Method or ability used to calculate the difficulty class.
 * @property {string} save.dc.formula               Custom DC formula or flat value.
 */

/**
 * @typedef {EffectApplicationData} SaveEffectApplicationData
 * @property {boolean} onSave  Should this effect still be applied on a successful save?
 */

/**
 * @typedef {ActivityData} SummonActivityData
 * @property {object} bonuses
 * @property {string} bonuses.ac            Formula for armor class bonus on summoned actor.
 * @property {string} bonuses.hd            Formula for bonus hit dice to add to each summoned NPC.
 * @property {string} bonuses.hp            Formula for bonus hit points to add to each summoned actor.
 * @property {string} bonuses.attackDamage  Formula for bonus added to damage for attacks.
 * @property {string} bonuses.saveDamage    Formula for bonus added to damage for saving throws.
 * @property {string} bonuses.healing       Formula for bonus added to healing.
 * @property {Set<string>} creatureSizes    Set of creature sizes that will be set on summoned creature.
 * @property {Set<string>} creatureTypes    Set of creature types that will be set on summoned creature.
 * @property {object} match
 * @property {string} match.ability         Ability to use for calculating match values.
 * @property {boolean} match.attacks        Match the to hit values on summoned actor's attack to the summoner.
 * @property {boolean} match.proficiency    Match proficiency on summoned actor to the summoner.
 * @property {boolean} match.saves          Match the save DC on summoned actor's abilities to the summoner.
 * @property {SummonsProfile[]} profiles    Information on creatures that can be summoned.
 * @property {object} summon
 * @property {string} summon.identifier     Class identifier that will be used to determine applicable level.
 * @property {""|"cr"} summon.mode          Method of determining what type of creature is summoned.
 * @property {boolean} summon.prompt        Should the player be prompted to place the summons?
 */

/**
 * @typedef SummonsProfile
 * @property {string} _id         Unique ID for this profile.
 * @property {string} count       Formula for the number of creatures to summon.
 * @property {string} cr          Formula for the CR of summoned creatures if in CR mode.
 * @property {object} level
 * @property {number} level.min   Minimum level at which this profile can be used.
 * @property {number} level.max   Maximum level at which this profile can be used.
 * @property {string} name        Display name for this profile if it differs from actor's name.
 * @property {Set<string>} types  Types of summoned creatures if in CR mode.
 * @property {string} uuid        UUID of the actor to summon if in default mode.
 */

/**
 * @typedef {ActivityData} TransformActivityData
 * @property {TransformProfile[]} profiles         Information on transformation methods and sources.
 * @property {TransformationSettingData} settings  Settings data to use when summoning.
 * @property {object} transform
 * @property {boolean} transform.customize         Should any customized settings be respected or should the default
 *                                                 settings for the selected profile be used instead.
 * @property {string} transform.identifier         Class identifier that will be used to determine applicable level.
 * @property {""|"cr"} transform.mode              Method of determining what type of creature to transform into.
 * @property {string} transform.preset             Transformation preset to use.
 */

/**
 * @typedef TransformProfile
 * @property {string} _id            Unique ID for this profile.
 * @property {string} cr             Formula for the CR of creature to transform into if in CR mode.
 * @property {object} level
 * @property {number} level.min      Minimum level at which this profile can be used.
 * @property {number} level.max      Maximum level at which this profile can be used.
 * @property {Set<string>} movement  Movement types that aren't allowed on selected creatures.
 * @property {string} name           Display name for this profile.
 * @property {Set<string>} sizes     Allowed creature sizes, or blank to allow all sizes.
 * @property {Set<string>} types     Allowed creature types, or blank to allow all types.
 * @property {string} uuid           UUID of the actor to transform into if in direct mode.
 */

/**
 * @typedef {ActivityData} UtilityActivityData
 * @property {object} roll
 * @property {string} roll.formula   Arbitrary formula that can be rolled.
 * @property {string} roll.name      Label for the rolling button.
 * @property {boolean} roll.prompt   Should the roll configuration dialog be displayed?
 * @property {boolean} roll.visible  Should the rolling button be visible to all players?
 */
