import {ClassFeatures} from "./classFeatures.js"

// Namespace Configuration Values
export const DND5E = {};

// ASCII Artwork
DND5E.ASCII = `_______________________________
______      ______ _____ _____
|  _  \\___  |  _  \\  ___|  ___|
| | | ( _ ) | | | |___ \\| |__
| | | / _ \\/\\ | | |   \\ \\  __|
| |/ / (_>  < |/ //\\__/ / |___
|___/ \\___/\\/___/ \\____/\\____/
_______________________________`;


/**
 * The set of Ability Scores used within the system
 * @type {Object}
 */
DND5E.abilities = {
  "str": "DND5E.AbilityStr",
  "dex": "DND5E.AbilityDex",
  "con": "DND5E.AbilityCon",
  "int": "DND5E.AbilityInt",
  "wis": "DND5E.AbilityWis",
  "cha": "DND5E.AbilityCha"
};

DND5E.abilityAbbreviations = {
  "str": "DND5E.AbilityStrAbbr",
  "dex": "DND5E.AbilityDexAbbr",
  "con": "DND5E.AbilityConAbbr",
  "int": "DND5E.AbilityIntAbbr",
  "wis": "DND5E.AbilityWisAbbr",
  "cha": "DND5E.AbilityChaAbbr"
};

/* -------------------------------------------- */

/**
 * Character alignment options
 * @type {Object}
 */
DND5E.alignments = {
  'lg': "DND5E.AlignmentLG",
  'ng': "DND5E.AlignmentNG",
  'cg': "DND5E.AlignmentCG",
  'ln': "DND5E.AlignmentLN",
  'tn': "DND5E.AlignmentTN",
  'cn': "DND5E.AlignmentCN",
  'le': "DND5E.AlignmentLE",
  'ne': "DND5E.AlignmentNE",
  'ce': "DND5E.AlignmentCE"
};


DND5E.weaponProficiencies = {
  "sim": "DND5E.WeaponSimpleProficiency",
  "mar": "DND5E.WeaponMartialProficiency"
};

DND5E.toolProficiencies = {
  "art": "DND5E.ToolArtisans",
  "disg": "DND5E.ToolDisguiseKit",
  "forg": "DND5E.ToolForgeryKit",
  "game": "DND5E.ToolGamingSet",
  "herb": "DND5E.ToolHerbalismKit",
  "music": "DND5E.ToolMusicalInstrument",
  "navg": "DND5E.ToolNavigators",
  "pois": "DND5E.ToolPoisonersKit",
  "thief": "DND5E.ToolThieves",
  "vehicle": "DND5E.ToolVehicle"
};


/* -------------------------------------------- */

/**
 * This Object defines the various lengths of time which can occur
 * @type {Object}
 */
DND5E.timePeriods = {
  "inst": "DND5E.TimeInst",
  "turn": "DND5E.TimeTurn",
  "round": "DND5E.TimeRound",
  "minute": "DND5E.TimeMinute",
  "hour": "DND5E.TimeHour",
  "day": "DND5E.TimeDay",
  "month": "DND5E.TimeMonth",
  "year": "DND5E.TimeYear",
  "perm": "DND5E.TimePerm",
  "spec": "DND5E.Special"
};


/* -------------------------------------------- */

/**
 * This describes the ways that an ability can be activated
 * @type {Object}
 */
DND5E.abilityActivationTypes = {
  "none": "DND5E.None",
  "action": "DND5E.Action",
  "bonus": "DND5E.BonusAction",
  "reaction": "DND5E.Reaction",
  "minute": DND5E.timePeriods.minute,
  "hour": DND5E.timePeriods.hour,
  "day": DND5E.timePeriods.day,
  "special": DND5E.timePeriods.spec,
  "legendary": "DND5E.LegAct",
  "lair": "DND5E.LairAct",
  "crew": "DND5E.VehicleCrewAction"
};

/* -------------------------------------------- */


DND5E.abilityConsumptionTypes = {
  "ammo": "DND5E.ConsumeAmmunition",
  "attribute": "DND5E.ConsumeAttribute",
  "material": "DND5E.ConsumeMaterial",
  "charges": "DND5E.ConsumeCharges"
};


/* -------------------------------------------- */

// Creature Sizes
DND5E.actorSizes = {
  "tiny": "DND5E.SizeTiny",
  "sm": "DND5E.SizeSmall",
  "med": "DND5E.SizeMedium",
  "lg": "DND5E.SizeLarge",
  "huge": "DND5E.SizeHuge",
  "grg": "DND5E.SizeGargantuan"
};

DND5E.tokenSizes = {
  "tiny": 1,
  "sm": 1,
  "med": 1,
  "lg": 2,
  "huge": 3,
  "grg": 4
};

/* -------------------------------------------- */

/**
 * Classification types for item action types
 * @type {Object}
 */
DND5E.itemActionTypes = {
  "mwak": "DND5E.ActionMWAK",
  "rwak": "DND5E.ActionRWAK",
  "msak": "DND5E.ActionMSAK",
  "rsak": "DND5E.ActionRSAK",
  "save": "DND5E.ActionSave",
  "heal": "DND5E.ActionHeal",
  "abil": "DND5E.ActionAbil",
  "util": "DND5E.ActionUtil",
  "other": "DND5E.ActionOther"
};

/* -------------------------------------------- */

DND5E.itemCapacityTypes = {
  "items": "DND5E.ItemContainerCapacityItems",
  "weight": "DND5E.ItemContainerCapacityWeight"
};

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability
 * @type {Object}
 */
DND5E.limitedUsePeriods = {
  "sr": "DND5E.ShortRest",
  "lr": "DND5E.LongRest",
  "day": "DND5E.Day",
  "charges": "DND5E.Charges"
};


/* -------------------------------------------- */

/**
 * The set of equipment types for armor, clothing, and other objects which can ber worn by the character
 * @type {Object}
 */
DND5E.equipmentTypes = {
  "light": "DND5E.EquipmentLight",
  "medium": "DND5E.EquipmentMedium",
  "heavy": "DND5E.EquipmentHeavy",
  "bonus": "DND5E.EquipmentBonus",
  "natural": "DND5E.EquipmentNatural",
  "shield": "DND5E.EquipmentShield",
  "clothing": "DND5E.EquipmentClothing",
  "trinket": "DND5E.EquipmentTrinket",
  "vehicle": "DND5E.EquipmentVehicle"
};


/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have
 * @type {Object}
 */
DND5E.armorProficiencies = {
  "lgt": DND5E.equipmentTypes.light,
  "med": DND5E.equipmentTypes.medium,
  "hvy": DND5E.equipmentTypes.heavy,
  "shl": "DND5E.EquipmentShieldProficiency"
};


/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system
 * @type {Object}
 */
DND5E.consumableTypes = {
  "ammo": "DND5E.ConsumableAmmunition",
  "potion": "DND5E.ConsumablePotion",
  "poison": "DND5E.ConsumablePoison",
  "food": "DND5E.ConsumableFood",
  "scroll": "DND5E.ConsumableScroll",
  "wand": "DND5E.ConsumableWand",
  "rod": "DND5E.ConsumableRod",
  "trinket": "DND5E.ConsumableTrinket"
};

/* -------------------------------------------- */

/**
 * The valid currency denominations supported by the 5e system
 * @type {Object}
 */
DND5E.currencies = {
  "pp": "DND5E.CurrencyPP",
  "gp": "DND5E.CurrencyGP",
  "ep": "DND5E.CurrencyEP",
  "sp": "DND5E.CurrencySP",
  "cp": "DND5E.CurrencyCP",
};


/**
 * Define the upwards-conversion rules for registered currency types
 * @type {{string, object}}
 */
DND5E.currencyConversion = {
  cp: {into: "sp", each: 10},
  sp: {into: "ep", each: 5 },
  ep: {into: "gp", each: 2 },
  gp: {into: "pp", each: 10}
};

/* -------------------------------------------- */


// Damage Types
DND5E.damageTypes = {
  "acid": "DND5E.DamageAcid",
  "bludgeoning": "DND5E.DamageBludgeoning",
  "cold": "DND5E.DamageCold",
  "fire": "DND5E.DamageFire",
  "force": "DND5E.DamageForce",
  "lightning": "DND5E.DamageLightning",
  "necrotic": "DND5E.DamageNecrotic",
  "piercing": "DND5E.DamagePiercing",
  "poison": "DND5E.DamagePoison",
  "psychic": "DND5E.DamagePsychic",
  "radiant": "DND5E.DamageRadiant",
  "slashing": "DND5E.DamageSlashing",
  "thunder": "DND5E.DamageThunder"
};

// Damage Resistance Types
DND5E.damageResistanceTypes = mergeObject(duplicate(DND5E.damageTypes), {
  "physical": "DND5E.DamagePhysical"
});


/* -------------------------------------------- */

DND5E.distanceUnits = {
  "none": "DND5E.None",
  "self": "DND5E.DistSelf",
  "touch": "DND5E.DistTouch",
  "ft": "DND5E.DistFt",
  "mi": "DND5E.DistMi",
  "spec": "DND5E.Special",
  "any": "DND5E.DistAny"
};

/* -------------------------------------------- */


/**
 * Configure aspects of encumbrance calculation so that it could be configured by modules
 * @type {Object}
 */
DND5E.encumbrance = {
  currencyPerWeight: 50,
  strMultiplier: 15,
  vehicleWeightMultiplier: 2000 // 2000 lbs in a ton
};

/* -------------------------------------------- */

/**
 * This Object defines the types of single or area targets which can be applied
 * @type {Object}
 */
DND5E.targetTypes = {
  "none": "DND5E.None",
  "self": "DND5E.TargetSelf",
  "creature": "DND5E.TargetCreature",
  "ally": "DND5E.TargetAlly",
  "enemy": "DND5E.TargetEnemy",
  "object": "DND5E.TargetObject",
  "space": "DND5E.TargetSpace",
  "radius": "DND5E.TargetRadius",
  "sphere": "DND5E.TargetSphere",
  "cylinder": "DND5E.TargetCylinder",
  "cone": "DND5E.TargetCone",
  "square": "DND5E.TargetSquare",
  "cube": "DND5E.TargetCube",
  "line": "DND5E.TargetLine",
  "wall": "DND5E.TargetWall"
};


/* -------------------------------------------- */


/**
 * Map the subset of target types which produce a template area of effect
 * The keys are DND5E target types and the values are MeasuredTemplate shape types
 * @type {Object}
 */
DND5E.areaTargetTypes = {
  cone: "cone",
  cube: "rect",
  cylinder: "circle",
  line: "ray",
  radius: "circle",
  sphere: "circle",
  square: "rect",
  wall: "ray"
};


/* -------------------------------------------- */

// Healing Types
DND5E.healingTypes = {
  "healing": "DND5E.Healing",
  "temphp": "DND5E.HealingTemp"
};


/* -------------------------------------------- */


/**
 * Enumerate the denominations of hit dice which can apply to classes
 * @type {Array.<string>}
 */
DND5E.hitDieTypes = ["d6", "d8", "d10", "d12"];


/* -------------------------------------------- */

/**
 * Character senses options
 * @type {Object}
 */
DND5E.senses = {
  "bs": "DND5E.SenseBS",
  "dv": "DND5E.SenseDV",
  "ts": "DND5E.SenseTS",
  "tr": "DND5E.SenseTR"
};


/* -------------------------------------------- */

/**
 * The set of skill which can be trained
 * @type {Object}
 */
DND5E.skills = {
  "acr": "DND5E.SkillAcr",
  "ani": "DND5E.SkillAni",
  "arc": "DND5E.SkillArc",
  "ath": "DND5E.SkillAth",
  "dec": "DND5E.SkillDec",
  "his": "DND5E.SkillHis",
  "ins": "DND5E.SkillIns",
  "itm": "DND5E.SkillItm",
  "inv": "DND5E.SkillInv",
  "med": "DND5E.SkillMed",
  "nat": "DND5E.SkillNat",
  "prc": "DND5E.SkillPrc",
  "prf": "DND5E.SkillPrf",
  "per": "DND5E.SkillPer",
  "rel": "DND5E.SkillRel",
  "slt": "DND5E.SkillSlt",
  "ste": "DND5E.SkillSte",
  "sur": "DND5E.SkillSur"
};


/* -------------------------------------------- */

DND5E.spellPreparationModes = {
  "always": "DND5E.SpellPrepAlways",
  "atwill": "DND5E.SpellPrepAtWill",
  "innate": "DND5E.SpellPrepInnate",
  "pact": "DND5E.PactMagic",
  "prepared": "DND5E.SpellPrepPrepared"
};

DND5E.spellUpcastModes = ["always", "pact", "prepared"];


DND5E.spellProgression = {
  "none": "DND5E.SpellNone",
  "full": "DND5E.SpellProgFull",
  "half": "DND5E.SpellProgHalf",
  "third": "DND5E.SpellProgThird",
  "pact": "DND5E.SpellProgPact",
  "artificer": "DND5E.SpellProgArt"
};

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed
 * @type {Object}
 */
DND5E.spellScalingModes = {
  "none": "DND5E.SpellNone",
  "cantrip": "DND5E.SpellCantrip",
  "level": "DND5E.SpellLevel"
};

/* -------------------------------------------- */


/**
 * Define the set of types which a weapon item can take
 * @type {Object}
 */
DND5E.weaponTypes = {
  "simpleM": "DND5E.WeaponSimpleM",
  "simpleR": "DND5E.WeaponSimpleR",
  "martialM": "DND5E.WeaponMartialM",
  "martialR": "DND5E.WeaponMartialR",
  "natural": "DND5E.WeaponNatural",
  "improv": "DND5E.WeaponImprov",
  "siege": "DND5E.WeaponSiege"
};


/* -------------------------------------------- */

/**
 * Define the set of weapon property flags which can exist on a weapon
 * @type {Object}
 */
DND5E.weaponProperties = {
  "amm": "DND5E.WeaponPropertiesAmm",
  "hvy": "DND5E.WeaponPropertiesHvy",
  "fin": "DND5E.WeaponPropertiesFin",
  "fir": "DND5E.WeaponPropertiesFir",
  "foc": "DND5E.WeaponPropertiesFoc",
  "lgt": "DND5E.WeaponPropertiesLgt",
  "lod": "DND5E.WeaponPropertiesLod",
  "rch": "DND5E.WeaponPropertiesRch",
  "rel": "DND5E.WeaponPropertiesRel",
  "ret": "DND5E.WeaponPropertiesRet",
  "spc": "DND5E.WeaponPropertiesSpc",
  "thr": "DND5E.WeaponPropertiesThr",
  "two": "DND5E.WeaponPropertiesTwo",
  "ver": "DND5E.WeaponPropertiesVer"
};


// Spell Components
DND5E.spellComponents = {
  "V": "DND5E.ComponentVerbal",
  "S": "DND5E.ComponentSomatic",
  "M": "DND5E.ComponentMaterial"
};

// Spell Schools
DND5E.spellSchools = {
  "abj": "DND5E.SchoolAbj",
  "con": "DND5E.SchoolCon",
  "div": "DND5E.SchoolDiv",
  "enc": "DND5E.SchoolEnc",
  "evo": "DND5E.SchoolEvo",
  "ill": "DND5E.SchoolIll",
  "nec": "DND5E.SchoolNec",
  "trs": "DND5E.SchoolTrs"
};

// Spell Levels
DND5E.spellLevels = {
  0: "DND5E.SpellLevel0",
  1: "DND5E.SpellLevel1",
  2: "DND5E.SpellLevel2",
  3: "DND5E.SpellLevel3",
  4: "DND5E.SpellLevel4",
  5: "DND5E.SpellLevel5",
  6: "DND5E.SpellLevel6",
  7: "DND5E.SpellLevel7",
  8: "DND5E.SpellLevel8",
  9: "DND5E.SpellLevel9"
};

// Spell Scroll Compendium UUIDs
DND5E.spellScrollIds = {
  0: 'Compendium.dnd5e.items.rQ6sO7HDWzqMhSI3',
  1: 'Compendium.dnd5e.items.9GSfMg0VOA2b4uFN',
  2: 'Compendium.dnd5e.items.XdDp6CKh9qEvPTuS',
  3: 'Compendium.dnd5e.items.hqVKZie7x9w3Kqds',
  4: 'Compendium.dnd5e.items.DM7hzgL836ZyUFB1',
  5: 'Compendium.dnd5e.items.wa1VF8TXHmkrrR35',
  6: 'Compendium.dnd5e.items.tI3rWx4bxefNCexS',
  7: 'Compendium.dnd5e.items.mtyw4NS1s7j2EJaD',
  8: 'Compendium.dnd5e.items.aOrinPg7yuDZEuWr',
  9: 'Compendium.dnd5e.items.O4YbkJkLlnsgUszZ'
};

/**
 * Define the standard slot progression by character level.
 * The entries of this array represent the spell slot progression for a full spell-caster.
 * @type {Array[]}
 */
DND5E.SPELL_SLOT_TABLE = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

/* -------------------------------------------- */

// Polymorph options.
DND5E.polymorphSettings = {
  keepPhysical: 'DND5E.PolymorphKeepPhysical',
  keepMental: 'DND5E.PolymorphKeepMental',
  keepSaves: 'DND5E.PolymorphKeepSaves',
  keepSkills: 'DND5E.PolymorphKeepSkills',
  mergeSaves: 'DND5E.PolymorphMergeSaves',
  mergeSkills: 'DND5E.PolymorphMergeSkills',
  keepClass: 'DND5E.PolymorphKeepClass',
  keepFeats: 'DND5E.PolymorphKeepFeats',
  keepSpells: 'DND5E.PolymorphKeepSpells',
  keepItems: 'DND5E.PolymorphKeepItems',
  keepBio: 'DND5E.PolymorphKeepBio',
  keepVision: 'DND5E.PolymorphKeepVision'
};

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels
 * Each level provides a proficiency multiplier
 * @type {Object}
 */
DND5E.proficiencyLevels = {
  0: "DND5E.NotProficient",
  1: "DND5E.Proficient",
  0.5: "DND5E.HalfProficient",
  2: "DND5E.Expertise"
};

/* -------------------------------------------- */

/**
 * The amount of cover provided by an object.
 * In cases where multiple pieces of cover are
 * in play, we take the highest value.
 */
DND5E.cover = {
  0: 'DND5E.None',
  .5: 'DND5E.CoverHalf',
  .75: 'DND5E.CoverThreeQuarters',
  1: 'DND5E.CoverTotal'
};

/* -------------------------------------------- */


// Condition Types
DND5E.conditionTypes = {
  "blinded": "DND5E.ConBlinded",
  "charmed": "DND5E.ConCharmed",
  "deafened": "DND5E.ConDeafened",
  "diseased": "DND5E.ConDiseased",
  "exhaustion": "DND5E.ConExhaustion",
  "frightened": "DND5E.ConFrightened",
  "grappled": "DND5E.ConGrappled",
  "incapacitated": "DND5E.ConIncapacitated",
  "invisible": "DND5E.ConInvisible",
  "paralyzed": "DND5E.ConParalyzed",
  "petrified": "DND5E.ConPetrified",
  "poisoned": "DND5E.ConPoisoned",
  "prone": "DND5E.ConProne",
  "restrained": "DND5E.ConRestrained",
  "stunned": "DND5E.ConStunned",
  "unconscious": "DND5E.ConUnconscious"
};

// Languages
DND5E.languages = {
  "common": "DND5E.LanguagesCommon",
  "aarakocra": "DND5E.LanguagesAarakocra",
  "abyssal": "DND5E.LanguagesAbyssal",
  "aquan": "DND5E.LanguagesAquan",
  "auran": "DND5E.LanguagesAuran",
  "celestial": "DND5E.LanguagesCelestial",
  "deep": "DND5E.LanguagesDeepSpeech",
  "draconic": "DND5E.LanguagesDraconic",
  "druidic": "DND5E.LanguagesDruidic",
  "dwarvish": "DND5E.LanguagesDwarvish",
  "elvish": "DND5E.LanguagesElvish",
  "giant": "DND5E.LanguagesGiant",
  "gith": "DND5E.LanguagesGith",
  "gnomish": "DND5E.LanguagesGnomish",
  "goblin": "DND5E.LanguagesGoblin",
  "gnoll": "DND5E.LanguagesGnoll",
  "halfling": "DND5E.LanguagesHalfling",
  "ignan": "DND5E.LanguagesIgnan",
  "infernal": "DND5E.LanguagesInfernal",
  "orc": "DND5E.LanguagesOrc",
  "primordial": "DND5E.LanguagesPrimordial",
  "sylvan": "DND5E.LanguagesSylvan",
  "terran": "DND5E.LanguagesTerran",
  "cant": "DND5E.LanguagesThievesCant",
  "undercommon": "DND5E.LanguagesUndercommon"
};

// Character Level XP Requirements
DND5E.CHARACTER_EXP_LEVELS =  [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]
;

// Challenge Rating XP Levels
DND5E.CR_EXP_LEVELS = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
  20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
];

// Character Features Per Class And Level
DND5E.classFeatures = ClassFeatures;

// Configure Optional Character Flags
DND5E.characterFlags = {
  "powerfulBuild": {
    name: "DND5E.FlagsPowerfulBuild",
    hint: "DND5E.FlagsPowerfulBuildHint",
    section: "Racial Traits",
    type: Boolean
  },
  "savageAttacks": {
    name: "DND5E.FlagsSavageAttacks",
    hint: "DND5E.FlagsSavageAttacksHint",
    section: "Racial Traits",
    type: Boolean
  },
  "elvenAccuracy": {
    name: "DND5E.FlagsElvenAccuracy",
    hint: "DND5E.FlagsElvenAccuracyHint",
    section: "Racial Traits",
    type: Boolean
  },
  "halflingLucky": {
    name: "DND5E.FlagsHalflingLucky",
    hint: "DND5E.FlagsHalflingLuckyHint",
    section: "Racial Traits",
    type: Boolean
  },
  "initiativeAdv": {
    name: "DND5E.FlagsInitiativeAdv",
    hint: "DND5E.FlagsInitiativeAdvHint",
    section: "Feats",
    type: Boolean
  },
  "initiativeAlert": {
    name: "DND5E.FlagsAlert",
    hint: "DND5E.FlagsAlertHint",
    section: "Feats",
    type: Boolean
  },
  "jackOfAllTrades": {
    name: "DND5E.FlagsJOAT",
    hint: "DND5E.FlagsJOATHint",
    section: "Feats",
    type: Boolean
  },
  "observantFeat": {
    name: "DND5E.FlagsObservant",
    hint: "DND5E.FlagsObservantHint",
    skills: ['prc','inv'],
    section: "Feats",
    type: Boolean
  },
  "reliableTalent": {
    name: "DND5E.FlagsReliableTalent",
    hint: "DND5E.FlagsReliableTalentHint",
    section: "Feats",
    type: Boolean
  },
  "remarkableAthlete": {
    name: "DND5E.FlagsRemarkableAthlete",
    hint: "DND5E.FlagsRemarkableAthleteHint",
    abilities: ['str','dex','con'],
    section: "Feats",
    type: Boolean
  },
  "weaponCriticalThreshold": {
    name: "DND5E.FlagsCritThreshold",
    hint: "DND5E.FlagsCritThresholdHint",
    section: "Feats",
    type: Number,
    placeholder: 20
  }
};

// Configure allowed status flags
DND5E.allowedActorFlags = [
  "isPolymorphed", "originalActor"
].concat(Object.keys(DND5E.characterFlags));
