/**
 * @import { UnitValue5e } from "../../_types.mjs";
 * @import {
 *   ActivationData, CreatureTypeData, DamageData, DurationData,
 *   MovementData, RangeData, SensesData, TargetData, UsesData
 * } from "../shared/_types.mjs";
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 * @import { SpellcastingFieldData } from "./fields/_types.mjs";
 */

/**
 * @typedef ClassItemSystemData
 * @property {object} hd                           Object describing hit dice properties.
 * @property {string} hd.additional                Additional hit dice beyond the level of the class.
 * @property {string} hd.denomination              Denomination of hit dice available as defined in `DND5E.hitDieTypes`.
 * @property {number} hd.spent                     Number of hit dice consumed.
 * @property {number} levels                       Current number of levels in this class.
 * @property {object} primaryAbility
 * @property {Set<string>} primaryAbility.value    List of primary abilities used by this class.
 * @property {boolean} primaryAbility.all          If multiple abilities are selected, does multiclassing require all
 *                                                 of them to be 13 or just one.
 * @property {Set<string>} properties              General properties of a class item.
 * @property {SpellcastingFieldData} spellcasting  Details on class's spellcasting ability.
 */

/**
 * @typedef ConsumableItemSystemData
 * @property {object} damage
 * @property {DamageData} damage.base               Damage caused by this ammunition.
 * @property {string} damage.replace                Should ammunition damage replace the base weapon's damage?
 * @property {string} magicalBonus                  Magical bonus added to attack & damage rolls by ammunition.
 * @property {Set<string>} properties               Ammunition properties.
 * @property {Omit<ItemTypeData, "baseItem">} type  Ammunition type and subtype.
 * @property {UsesData} uses
 * @property {boolean} uses.autoDestroy  Should this item be destroyed when it runs out of uses.
 */

/**
 * @typedef ContainerItemSystemData
 * @property {object} capacity              Information on container's carrying capacity.
 * @property {number} capacity.count        Number of items that can be stored within the container.
 * @property {UnitValue5e} capacity.volume  Amount of volume that can be stored.
 * @property {UnitValue5e} capacity.weight  Amount of weight that can be stored.
 * @property {Set<string>} properties       Container properties.
 */

/**
 * @typedef EquipmentItemSystemData
 * @property {object} armor                        Armor details and equipment type information.
 * @property {number} armor.value                  Base armor class or shield bonus.
 * @property {string} armor.magicalBonus           Bonus added to AC from the armor's magical nature.
 * @property {number} armor.dex                    Maximum dex bonus added to armor class.
 * @property {number} proficient                   Does the owner have proficiency in this piece of equipment?
 * @property {Set<string>} properties              Equipment properties.
 * @property {number} strength                     Minimum strength required to use a piece of armor.
 * @property {Omit<ItemTypeData, "subtype">} type  Equipment type & base item.
 */

/**
 * @typedef FacilityItemSystemData
 * @property {object} building
 * @property {boolean} building.built                Whether the facility has been fully built. Only applicable to basic
 *                                                   facilities.
 * @property {string} building.size                  The target size for the facility to be built at.
 * @property {object} craft
 * @property {string} craft.item                     The Item the facility is currently crafting.
 * @property {number} craft.quantity                 The number of Items being crafted.
 * @property {FacilityOccupants} defenders           The facility's configured defenders.
 * @property {boolean} disabled                      Whether the facility is currently disabled.
 * @property {boolean} enlargeable                   Whether the facility is capable of being enlarged.
 * @property {boolean} free                          Whether the facility counts towards the character's maximum special
 *                                                   facility cap.
 * @property {FacilityOccupants} hirelings           The facility's configured hirelings.
 * @property {number} level                          The minimum level required to build this facility.
 * @property {string} order                          The order type associated with this facility.
 * @property {object} progress
 * @property {number} progress.value                 The number of days' progress made towards completing the order.
 * @property {number} progress.max                   The number of days required to complete the order.
 * @property {string} progress.order                 The order that is currently being executed.
 * @property {string} size                           The size category of the facility.
 * @property {object} trade
 * @property {FacilityOccupants} trade.creatures     The trade facility's stocked creatures.
 * @property {object} trade.pending
 * @property {string[]} trade.pending.creatures      Creatures being bought or sold.
 * @property {"buy"|"sell"} trade.pending.operation  The type of trade operation that was executed this turn.
 * @property {boolean} trade.pending.stocked         The inventory will be fully stocked when the order completes.
 * @property {number} trade.pending.value            The base value transacted during the trade operation this turn.
 * @property {number} trade.profit                   The trade facility's profit factor as a percentage.
 * @property {object} trade.stock
 * @property {boolean} trade.stock.stocked           Whether the facility is fully stocked.
 * @property {number} trade.stock.value              The value of the currently stocked goods.
 * @property {number} trade.stock.max                The maximum value of goods this facility can stock.
 * @property {Omit<ItemTypeData, "baseItem">} type   Facility type & subtype.
 */

/**
 * @typedef FacilityOccupants
 * @property {string[]} value  A list of Actor UUIDs assigned to the facility.
 * @property {number} max      The facility's maximum occupant capacity.
 */

/**
 * @typedef FeatItemSystemData
 * @property {number} cover                         Amount of cover this feature affords to its crew on a vehicle.
 * @property {boolean} crewed                       Is this vehicle feature currently crewed?
 * @property {object} enchant
 * @property {string} enchant.max                   Maximum number of items that can have this enchantment.
 * @property {string} enchant.period                Frequency at which the enchantment can be swapped.
 * @property {object} prerequisites
 * @property {Set<string>} prerequisites.items      Items that must be taken first before this item.
 * @property {number} prerequisites.level           Character or class level required to choose this feature.
 * @property {boolean} prerequisites.repeatable     Can this item be selected more than once?
 * @property {Set<string>} properties               General properties of a feature item.
 * @property {string} requirements                  Actor details required to use this feature.
 * @property {Omit<ItemTypeData, "baseItem">} type  Feature type and subtype.
 */

/**
 * @typedef LootItemSystemData
 * @property {Set<string>} properties               General properties of a loot item.
 * @property {Omit<ItemTypeData, "baseItem">} type  Loot type and subtype.
 */

/**
 * @typedef RaceItemSystemData
 * @property {Omit<MovementData, "special">} movement
 * @property {SensesData} senses
 * @property {Omit<CreatureTypeData, "swarm">} type
 */

/**
 * @typedef SpellItemSystemData
 * @property {string} ability                    Override of default spellcasting ability.
 * @property {ActivationData} activation         Casting time & conditions.
 * @property {DurationData} duration             Duration of the spell effect.
 * @property {number} level                      Base level of the spell.
 * @property {object} materials                  Details on material components required for this spell.
 * @property {string} materials.value            Description of the material components required for casting.
 * @property {boolean} materials.consumed        Are these material components consumed during casting?
 * @property {number} materials.cost             GP cost for the required components.
 * @property {number} materials.supply           Quantity of this component available.
 * @property {string} method                     The spellcasting method this spell was gained via.
 * @property {number} prepared                   The spell availability.
 * @property {Set<string>} properties            General components and tags for this spell.
 * @property {RangeData} range                   Range of the spell
 * @property {string} school                     Magical school to which this spell belongs.
 * @property {string} sourceClass                Associated spellcasting class when this spell is on an actor.
 * @property {TargetData} target                 Information on area and individual targets.
 */

/**
 * @typedef SubclassItemSystemData
 * @property {string} classIdentifier              Identifier slug for the class with which this subclass
 *                                                 should be associated.
 * @property {SpellcastingFieldData} spellcasting  Details on subclass's spellcasting ability.
 */

/**
 * @typedef ToolItemSystemData
 * @property {string} ability                      Default ability when this tool is being used.
 * @property {string} bonus                        Bonus formula added to tool rolls.
 * @property {string} chatFlavor                   Additional text added to chat when this tool is used.
 * @property {number} proficient                   Level of proficiency as defined in `DND5E.proficiencyLevels`.
 * @property {Set<string>} properties              Tool properties.
 * @property {Omit<ItemTypeData, "subtype">} type  Tool type and base item.
 */

/**
 * @typedef WeaponItemSystemData
 * @property {object} ammunition
 * @property {string} ammunition.type              Type of ammunition fired by this weapon.
 * @property {object} armor
 * @property {number} armor.value                  Siege or vehicle weapon's armor class.
 * @property {object} damage
 * @property {DamageData} damage.base              Weapon's base damage.
 * @property {DamageData} damage.versatile         Weapon's versatile damage.
 * @property {string} magicalBonus                 Magical bonus added to attack & damage rolls.
 * @property {string} mastery                      Mastery Property usable with this weapon.
 * @property {Set<string>} properties              Weapon's properties.
 * @property {number} proficient                   Does the weapon's owner have proficiency?
 * @property {object} range
 * @property {number} range.value                  Short range of the weapon.
 * @property {number} range.long                   Long range of the weapon.
 * @property {number|null} range.reach             Reach of the weapon.
 * @property {string} range.units                  Units used to measure the weapon's range and reach.
 * @property {Omit<ItemTypeData, "subtype">} type  Weapon type and base item.
 */
