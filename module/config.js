// Namespace D&D5e Configuration Values
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

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have
 * @type {Object}
 */
DND5E.armorProficiencies = {
  "lgt": "Light Armor",
  "med": "Medium Armor",
  "hvy": "Heavy Armor",
  "shl": "Shields"
};

DND5E.weaponProficiencies = {
  "sim": "Simple Weapons",
  "mar": "Martial Weapons"
};

DND5E.toolProficiencies = {
  "art": "Artisan's Tools",
  "disg": "Disguise Kit",
  "forg": "Forgery Kit",
  "game": "Gaming Set",
  "herb": "Herbalism Kit",
  "music": "Musical Instrument",
  "navg": "Navigator's Tools",
  "pois": "Poisoner's Kit",
  "thief": "Thieves' Tools",
  "vehicle": "Vehicle (Land or Water)"
};

/* -------------------------------------------- */

/**
 * This describes the ways that an ability can be activated
 * @type {Object}
 */
DND5E.abilityActivationTypes = {
  "none": "None",
  "action": "Action",
  "bonus": "Bonus Action",
  "reaction": "Reaction",
  "minute": "Minute",
  "hour": "Hour",
  "day": "Day",
  "special": "Special",
  "legendary": "Legendary",
  "lair": "Lair"
};

/* -------------------------------------------- */

// Creature Sizes
DND5E.actorSizes = {
  "tiny": "Tiny",
  "sm": "Small",
  "med": "Medium",
  "lg": "Large",
  "huge": "Huge",
  "grg": "Gargantuan"
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
  "matk": "Melee Weapon Attack",
  "ratk": "Ranged Weapon Attack",
  "satk": "Spell Attack",
  "save": "Saving Throw",
  "heal": "Healing",
  "abil": "Ability Test",
  "util": "Utility",
  "other": "Other"
};

/* -------------------------------------------- */


/**
 * Enumerate the lengths of time over which an item can have limited use ability
 * @type {Object}
 */
DND5E.limitedUsePeriods = {
  "sr": "Short Rest",
  "lr": "Long Rest",
  "day": "Day",
  "charges": "Charges"
};


/* -------------------------------------------- */

// Equipment Types
DND5E.equipmentTypes = {
  "light": "Light Armor",
  "medium": "Medium Armor",
  "heavy": "Heavy Armor",
  "bonus": "Magical Bonus",
  "natural": "Natural Armor",
  "shield": "Shield",
  "clothing": "Clothing",
  "trinket": "Trinket"
};
DND5E.armorTypes = DND5E.equipmentTypes;


/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system
 * @type {Object}
 */
DND5E.consumableTypes = {
  "potion": "Potion",
  "poison": "Poison",
  "scroll": "Scroll",
  "wand": "Wand",
  "rod": "Rod",
  "trinket": "Trinket"
};

/* -------------------------------------------- */

/**
 * The valid currency denominations supported by the 5e system
 * @type {Object}
 */
DND5E.currencies = {
  "pp": "DND5E.currencyPP",
  "gp": "DND5E.currencyGP",
  "ep": "DND5E.currencyEP",
  "sp": "DND5E.currencySP",
  "cp": "DND5E.currencyCP",
};

/* -------------------------------------------- */


// Damage Types
DND5E.damageTypes = {
  "acid": "Acid",
  "bludgeoning": "Bludgeoning",
  "cold": "Cold",
  "fire": "Fire",
  "force": "Force",
  "lightning": "Lightning",
  "necrotic": "Necrotic",
  "piercing": "Piercing",
  "poison": "Poison",
  "psychic": "Psychic",
  "radiant": "Radiant",
  "slashing": "Slashing",
  "thunder": "Thunder"
};

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
 * This Object defines the types of single or area targets which can be applied in D&D5e
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
  "cube": "DND5E.TargetCube",
  "line": "DND5E.TargetLine",
  "wall": "DND5E.TargetWall"
};

/* -------------------------------------------- */

/**
 * This Object defines the various lengths of time which can occur in D&D5e
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

// Healing Types
DND5E.healingTypes = {
  "healing": "Healing",
  "temphp": "Healing (Temporary)"
};

/* -------------------------------------------- */


/**
 * The set of skill which can be trained in D&D5e
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
  "always": "Always Available",
  "prepared": "Prepared Spell",
  "innate": "Innate Spellcasting",
  "pact": "Pact Magic"
};

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed
 * @type {Object}
 */
DND5E.spellScalingModes = {
  "none": "None",
  "cantrip": "Cantrip",
  "level": "Spell Level"
};


/* -------------------------------------------- */

// Weapon Types
DND5E.weaponTypes = {
  "simpleM": "Simple Melee",
  "simpleR": "Simple Ranged",
  "martialM": "Martial Melee",
  "martialR": "Martial Ranged",
  "natural": "Natural",
  "improv": "Improvised",
  "ammo": "Ammunition"
};


/* -------------------------------------------- */

/**
 * Define the set of weapon property flags which can exist on a weapon
 * @type {Object}
 */
DND5E.weaponProperties = {
  "amm": "Ammunition",
  "hvy": "Heavy",
  "fin": "Finesse",
  "fir": "Firearm",
  "foc": "Focus",
  "lgt": "Light",
  "rch": "Reach",
  "rel": "Reload",
  "ret": "Returning",
  "spc": "Special",
  "thr": "Thrown",
  "two": "Two-Handed",
  "ver": "Versatile"
};


// Spell Components
DND5E.spellComponents = {
  "V": "Verbal",
  "S": "Somatic",
  "M": "Material"
};

// Spell Schools
DND5E.spellSchools = {
  "abj": "Abjuration",
  "con": "Conjuration",
  "div": "Divination",
  "enc": "Enchantment",
  "evo": "Evocation",
  "ill": "Illusion",
  "nec": "Necromancy",
  "trs": "Transmutation",
};

// Spell Levels
DND5E.spellLevels = {
  0: "Cantrip",
  1: "1st Level",
  2: "2nd Level",
  3: "3rd Level",
  4: "4th Level",
  5: "5th Level",
  6: "6th Level",
  7: "7th Level",
  8: "8th Level",
  9: "9th Level"
};

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels
 * Each level provides a proficiency multiplier
 * @type {Object}
 */
DND5E.proficiencyLevels = {
  0: "Not Proficient",
  1: "Proficient",
  0.5: "Jack of all Trades",
  2: "Expertise"
};

/* -------------------------------------------- */


// Condition Types
DND5E.conditionTypes = {
  "blinded": "Blinded",
  "charmed": "Charmed",
  "deafened": "Deafened",
  "frightened": "Frightened",
  "grappled": "Grappled",
  "incapacitated": "Inacapacitated",
  "invisible": "Invisible",
  "paralyzed": "Paralyzed",
  "petrified": "Petrified",
  "poisoned": "Poisoned",
  "prone": "Prone",
  "restrained": "Restrained",
  "stunned": "Stunned",
  "unconscious": "Unconscious",
  "exhaustion": "Exhaustion",
  "diseased": "Diseased"
};

// Languages
DND5E.languages = {
  "common": "Common",
  "aarakocra": "Aarakocra",
  "abyssal": "Abyssal",
  "aquan": "Aquan",
  "auran": "Auran",
  "celestial": "Celestial",
  "deep": "Deep Speech",
  "draconic": "Draconic",
  "druidic": "Druidic",
  "dwarvish": "Dwarvish",
  "elvish": "Elvish",
  "giant": "Giant",
  "gith": "Gith",
  "gnomish": "Gnomish",
  "goblin": "Goblin",
  "gnoll": "Gnoll",
  "halfling": "Halfling",
  "ignan": "Ignan",
  "infernal": "Infernal",
  "orc": "Orc",
  "primordial": "Primordial",
  "sylvan": "Sylvan",
  "terran": "Terran",
  "cant": "Thieves' Cant",
  "undercommon": "Undercommon"
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

// Configure Optional Character Flags
DND5E.characterFlags = {
  "weaponCriticalThreshold": {
    name: "Weapon Critical Hit Threshold",
    hint: "Allow for expanded critical range; for example Improved or Superior Critical",
    section: "Feats",
    type: Number,
    placeholder: 20
  },
  "powerfulBuild": {
    name: "Powerful Build",
    hint: "Provides increased carrying capacity.",
    section: "Racial Traits",
    type: Boolean
  },
  "savageAttacks": {
    name: "Savage Attacks",
    hint: "Adds extra critical hit weapon dice.",
    section: "Racial Traits",
    type: Boolean
  },
  // "elvenAccuracy": {
  //   name: "Elven Accuracy",
  //   hint: "Roll an extra d20 with advantage to Dex, Int, Wis, or Cha.",
  //   section: "Feats",
  //   type: Boolean
  // },
  "initiativeAdv": {
    name: "Advantage on Initiative",
    hint: "Provided by feats or magical items.",
    section: "Feats",
    type: Boolean
  },
  "initiativeHalfProf": {
    name: "Half-Proficiency to Initiative",
    hint: "Provided by Jack of All Trades or Remarkable Athlete.",
    section: "Feats",
    type: Boolean
  },
  "initiativeAlert": {
    name: "Alert Feat",
    hint: "Provides +5 to Initiative.",
    section: "Feats",
    type: Boolean
  },
  "saveBonus": {
    name: "Saving Throw Bonus",
    hint: "Bonus modifier to all saving throws (e.g. +1)",
    section: "Feats",
    type: Number,
    placeholder: "+0"
  },
  "spellDCBonus": {
    name: "Spell DC Bonus",
    hint: "Modifies normal spellcasting DC.",
    section: "Feats",
    type: Number,
    placeholder: "+0"
  }
};
