/**
 * @import { UnitValue5e } from "../../_types.mjs";
 * @import { RestConfiguration, RestResult } from "../../documents/_types.mjs";
 * @import { CreatureTypeData, RollConfigData, SourceData } from "../shared/_types.mjs";
 * @import { SimpleTraitData, TravelData, TravelPace5e } from "./fields/_types.mjs";
 * @import {
 *   ArmorClassData, AttributesCommonData, AttributesCreatureData, DetailsCommonData,
 *   DetailsCreatureData, HitPointsData, TraitsCommonData, TraitsCreatureData
 * } from "./templates/_types.mjs";
 */

/**
 * @typedef CharacterActorSystemData
 * @property {Union<AttributesCommonData, AttributesCreatureData>} attributes
 * @property {HitPointsData} attributes.hp
 * @property {object} attributes.hp.bonuses
 * @property {string} attributes.hp.bonuses.level         Bonus formula applied for each class level.
 * @property {string} attributes.hp.bonuses.overall       Bonus formula applied to total HP.
 * @property {Omit<RollConfigData, "ability">} attributes.death
 * @property {number} attributes.death.success            Number of successful death saves.
 * @property {number} attributes.death.failure            Number of failed death saves.
 * @property {object} attributes.death.bonuses
 * @property {string} attributes.death.bonuses.save       Numeric or dice bonus to death saving throws.
 * @property {number} attributes.inspiration              Does this character have inspiration?
 * @property {object} bastion
 * @property {string} bastion.name                        The name of the character's bastion.
 * @property {string} bastion.description                 Additional description and details for the character's
 *                                                        bastion.
 * @property {Union<DetailsCommonData, DetailsCreatureData>} details
 * @property {Item5e|string} details.background           Character's background item or name.
 * @property {string} details.originalClass               ID of first class taken by character.
 * @property {object} details.xp                          Experience points gained.
 * @property {number} details.xp.value                    Total experience points earned.
 * @property {string} details.appearance                  Description of character's appearance.
 * @property {string} details.trait                       Character's personality traits.
 * @property {string} details.gender                      Character's gender.
 * @property {string} details.eyes                        Character's eyes.
 * @property {string} details.height                      Character's height.
 * @property {string} details.faith                       Character's faith.
 * @property {string} details.hair                        Character's hair.
 * @property {string} details.skin                        Character's skin.
 * @property {string} details.age                         Character's age.
 * @property {string} details.weight                      Character's weight.
 * @property {Union<TraitsCommonData, TraitsCreatureData>} traits
 * @property {SimpleTraitData} traits.weaponProf             Character's weapon proficiencies.
 * @property {object} traits.weaponProf.mastery
 * @property {Set<string>} traits.weaponProf.mastery.value   Weapon masteries.
 * @property {Set<string>} traits.weaponProf.mastery.bonus   Extra mastery properties that can be chosen when making an
 *                                                           attack with a weapon that has mastery.
 * @property {SimpleTraitData} traits.armorProf              Character's armor proficiencies.
 * @property {object} resources
 * @property {ResourceData} resources.primary             Resource number one.
 * @property {ResourceData} resources.secondary           Resource number two.
 * @property {ResourceData} resources.tertiary            Resource number three.
 * @property {ActorFavorites5e[]} favorites               The character's favorites.
 */

/**
 * @typedef ActorFavorites5e
 * @property {ActorFavoriteType5e} type  The favorite type.
 * @property {string} id                 The Document UUID, skill or tool identifier, or spell slot level identifier.
 * @property {number} [sort]             The sort value.
 */

/**
 * @typedef {"activity"|"effect"|"item"|"skill"|"slots"|"tool"} ActorFavoriteType5e
 */

/**
 * @typedef ResourceData
 * @property {number} value  Available uses of this resource.
 * @property {number} max    Maximum allowed uses of this resource.
 * @property {boolean} sr    Does this resource recover on a short rest?
 * @property {boolean} lr    Does this resource recover on a long rest?
 * @property {string} label  Displayed name.
 */

/* -------------------------------------------- */

/**
 * @typedef EncounterActorSystemData
 * @property {EncounterMemberData[]} members  Members of the encounter.
 */

/**
 * @typedef EncounterMemberData
 * @property {string} uuid                The UUID to the Actor.
 * @property {object} quantity
 * @property {number} quantity.value      Number of this actor in the group.
 * @property {string} [quantity.formula]  Formula used for re-rolling actor quantities in encounters.
 */

/* -------------------------------------------- */

/**
 * @typedef GroupActorSystemData
 * @property {object} attributes
 * @property {TravelData} attributes.travel
 * @property {object} details
 * @property {object} details.xp
 * @property {number} details.xp.value           XP currently available to be distributed to a party.
 * @property {PartyMemberData[]} members         Members in this group with associated metadata.
 * @property {Actor5e|null} primaryVehicle       The group's primary vehicle.
 */

/**
 * @typedef PartyMemberData
 * @property {Actor5e} actor              Associated actor document.
 */

/**
 * @typedef {RestConfiguration} GroupRestConfiguration
 * @param {boolean} [autoRest]  Automatically perform rest for group members rather than creating request message.
 * @param {string[]} [targets]  IDs of actors to rest. If not provided, then all group actors will be rested.
 */

/**
 * @typedef TravelPaceDescriptor
 * @param {object} pace
 * @param {boolean} pace.available        Whether a travel pace is available to this group.
 * @param {string} pace.label             The human-readable travel pace label.
 * @param {boolean} pace.slowed           Whether travel pace has been slowed by a member with reduced speed.
 * @param {TravelPace5e} pace.value       The travel pace key.
 * @param {Record<string, number>} paces  The available travel pace speeds.
 */

/* -------------------------------------------- */

/**
 * @typedef NPCActorSystemData
 * @property {Union<AttributesCommonData, AttributesCreatureData>} attributes
 * @property {object} attributes.hd
 * @property {number} attributes.hd.spent        Number of hit dice spent.
 * @property {HitPointsData} attributes.hp
 * @property {string} attributes.hp.formula      Formula used to determine hit points.
 * @property {Omit<RollConfigData, "ability">} attributes.death
 * @property {number} attributes.death.success        Number of successful death saves.
 * @property {number} attributes.death.failure        Number of failed death saves.
 * @property {object} attributes.death.bonuses
 * @property {string} attributes.death.bonuses.save   Numeric or dice bonus to death saving throws.
 * @property {object} attributes.price
 * @property {number|null} attributes.price.value     The creature's value in the specified denomination.
 * @property {string} attributes.price.denomination   The currency denomination.
 * @property {object} attributes.spell
 * @property {number} attributes.spell.level     Spellcasting level of this NPC.
 * @property {Union<DetailsCommonData, DetailsCreatureData>} details
 * @property {CreatureTypeData} details.type     Creature type of this NPC.
 * @property {object} details.habitat
 * @property {NPCHabitatData[]} details.habitat.value  Common habitats in which this NPC is found.
 * @property {string} details.habitat.custom     Custom habitats.
 * @property {object} details.treasure
 * @property {number} details.cr                 NPC's challenge rating.
 * @property {Set<string>} details.treasure.value  Random treasure generation categories for this NPC.
 * @property {object} resources
 * @property {object} resources.legact           NPC's legendary actions.
 * @property {number} resources.legact.max       Maximum number of legendary actions.
 * @property {number} resources.legact.spent     Spent legendary actions.
 * @property {object} resources.legres           NPC's legendary resistances.
 * @property {number} resources.legres.max       Maximum number of legendary resistances.
 * @property {number} resources.legres.spent     Spent legendary resistances.
 * @property {object} resources.lair             NPC's lair actions.
 * @property {boolean} resources.lair.value      This creature can possess a lair (2024) or take lair actions (2014).
 * @property {number} resources.lair.initiative  Initiative count when lair actions are triggered.
 * @property {boolean} resources.lair.inside     This actor is currently inside its lair.
 * @property {SourceData} source                 Adventure or sourcebook where this NPC originated.
 * @property {Union<TraitsCommonData, TraitsCreatureData>} traits
 * @property {boolean} traits.important          This NPC is important and should have loyalty & death saves.
 */

/**
 * @typedef NPCHabitatData
 * @property {string} type       The habitat category.
 * @property {string} [subtype]  An optional discriminator for the main category.
 */

/* -------------------------------------------- */

/**
 * @typedef VehicleActorSystemData
 * @property {AttributesCommonData} attributes
 * @property {HitPointsData} attributes.hp
 * @property {number} attributes.hp.mt                 Mishap threshold.
 * @property {object} attributes.actions               Information on how the vehicle performs actions.
 * @property {number} attributes.actions.max           Maximum number of actions available with a full crew complement.
 * @property {number} attributes.actions.spent         Spent actions.
 * @property {boolean} attributes.actions.stations     Does this vehicle rely on action stations that required
 *                                                     individual crewing rather than general crew thresholds?
 * @property {object} attributes.actions.thresholds    Crew thresholds needed to perform various actions.
 * @property {number} attributes.actions.thresholds.2  Minimum crew needed to take full action complement.
 * @property {number} attributes.actions.thresholds.1  Minimum crew needed to take reduced action complement.
 * @property {number} attributes.actions.thresholds.0  Minimum crew needed to perform any actions.
 * @property {object} attributes.capacity              Information on the vehicle's carrying capacity.
 * @property {UnitValue5e} attributes.capacity.cargo   Cargo carrying capacity.
 * @property {object} attributes.price
 * @property {number|null} attributes.price.value      The vehicle's cost in the specified denomination.
 * @property {string} attributes.price.denomination    The currency denomination.
 * @property {object} attributes.quality
 * @property {number} attributes.quality.value         Quality score of the vehicle's crew.
 * @property {TravelData} attributes.travel            Travel speeds.
 * @property {object} crew
 * @property {number} crew.max                         The maximum crew complement the vehicle supports.
 * @property {string[]} crew.value                     The crew roster.
 * @property {DetailsCommonData} details
 * @property {string} details.type                     The type of vehicle as defined in DND5E.vehicleTypes.
 * @property {object} draft
 * @property {string[]} draft.value                    The draft animals pulling the vehicle.
 * @property {object} passengers
 * @property {number} passengers.max                   The maximum number of passengers the vehicle supports.
 * @property {string[]} passengers.value               The passenger manifest.
 * @property {SourceData} source                       Adventure or sourcebook where this vehicle originated.
 * @property {TraitsCommonData} traits
 * @property {UnitValue5e} traits.weight               The vehicle's weight.
 * @property {UnitValue5e} traits.keel                 The vehicle's keel length.
 * @property {UnitValue5e} traits.beam                 The vehicle's beam length.
 */

/**
 * @typedef PassengerData
 * @property {string} name      Name of individual or type of creature.
 * @property {number} quantity  How many of this creature are onboard?
 */
