import { preLocalize } from "./utils.mjs";

// Namespace Configuration Values
const SHAPER = {};

// ASCII Artwork
SHAPER.ASCII = `
███████╗████████╗_██████╗_██████╗_██╗___██╗
██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗_██╔╝
███████╗___██║___██║___██║██████╔╝_╚████╔╝_
╚════██║___██║___██║___██║██╔══██╗__╚██╔╝__
███████║___██║___╚██████╔╝██║__██║___██║___
╚══════╝___╚═╝____╚═════╝_╚═╝__╚═╝___╚═╝___
___________________________________________
███████╗██╗__██╗_█████╗_██████╗_███████╗██████╗_
██╔════╝██║__██║██╔══██╗██╔══██╗██╔════╝██╔══██╗
███████╗███████║███████║██████╔╝█████╗__██████╔╝
╚════██║██╔══██║██╔══██║██╔═══╝_██╔══╝__██╔══██╗
███████║██║__██║██║__██║██║_____███████╗██║__██║
╚══════╝╚═╝__╚═╝╚═╝__╚═╝╚═╝_____╚══════╝╚═╝__╚═╝
________________________________________________`;


/**
 * The set of Ability Scores used within the system.
 * @enum {string}
 */
SHAPER.abilities = {
  str: "SHAPER.AbilityStr",
  fin: "SHAPER.AbilityFin",
  tgh: "SHAPER.AbilityTgh",
  mnd: "SHAPER.AbilityMnd",
  hrt: "SHAPER.AbilityHrt",
  sol: "SHAPER.AbilitySol"
};
preLocalize("abilities");

/**
 * Localized abbreviations for Ability Scores.
 * @enum {string}
 */
SHAPER.abilityAbbreviations = {
  str: "SHAPER.AbilityStrAbbr",
  fin: "SHAPER.AbilityFinAbbr",
  tgh: "SHAPER.AbilityTghAbbr",
  mnd: "SHAPER.AbilityMndAbbr",
  hrt: "SHAPER.AbilityHrtAbbr",
  sol: "SHAPER.AbilitySolAbbr"
};
preLocalize("abilityAbbreviations");

/* -------------------------------------------- */

/**
 * Configuration data for skills.
 *
 * @typedef {object} SkillConfiguration
 * @property {string} label    Localized label.
 * @property {string} ability  Key for the default ability used by this skill.
 */

/**
 * The set of skill which can be trained with their default ability scores.
 * @enum {SkillConfiguration}
 */
SHAPER.skills = {
  acr: { label: "SHAPER.SkillAcr", ability: ["dex", "fin"] },
  ath: { label: "SHAPER.SkillAth", ability: ["str", "tgh"] },
  ani: { label: "SHAPER.SkillAni", ability: ["hrt", "sol"] },
  awa: { label: "SHAPER.SkillAwa", ability: ["mnd", "sol"] },
  cmp: { label: "SHAPER.SkillCmp", ability: ["tgh", "sol"] },
  con: { label: "SHAPER.SkillCon", ability: ["tgh", "mnd"] },
  cft: { label: "SHAPER.SkillCft", ability: ["fin", "mnd"] },
  dec: { label: "SHAPER.SkillDec", ability: ["mnd", "hrt"] },
  dip: { label: "SHAPER.SkillDip", ability: ["hrt", "sol"] },
  drv: { label: "SHAPER.SkillDrv", ability: ["fin", "mnd"] },
  emp: { label: "SHAPER.SkillEmp", ability: ["hrt", "sol"] },
  end: { label: "SHAPER.SkillEnd", ability: ["tgh", "hrt"] },
  int: { label: "SHAPER.SkillInt", ability: ["str", "hrt"] },
  inv: { label: "SHAPER.SkillInv", ability: ["mnd", "sol"] },
  lor: { label: "SHAPER.SkillLor", ability: ["mnd", "sol"] },
  med: { label: "SHAPER.SkillMed", ability: ["mnd", "fin"] },
  per: { label: "SHAPER.SkillPer", ability: ["fin", "hrt"] },
  sab: { label: "SHAPER.SkillSab", ability: ["fin", "mnd"] },
  sci: { label: "SHAPER.SkillSci", ability: ["mnd", "sol"] },
  stl: { label: "SHAPER.SkillStl", ability: ["fin", "mnd"] },
  stw: { label: "SHAPER.SkillStw", ability: ["mnd", "hrt"] },
  sur: { label: "SHAPER.SkillSur", ability: ["mnd", "sol"] },
  tch: { label: "SHAPER.SkillTch", ability: ["fin", "mnd"] }
};
preLocalize("skills", { key: "label", sort: true });
patchConfig("skills", "label", { since: 2.0, until: 2.2 });

/* -------------------------------------------- */

/**
 * The various lengths of time over which effects can occur.
 * @enum {string}
 */
SHAPER.timePeriods = {
  inst: "SHAPER.TimeInst",
  turn: "SHAPER.TimeTurn",
  round: "SHAPER.TimeRound",
  minute: "SHAPER.TimeMinute",
  hour: "SHAPER.TimeHour",
  day: "SHAPER.TimeDay",
  month: "SHAPER.TimeMonth",
  year: "SHAPER.TimeYear",
  perm: "SHAPER.TimePerm",
  spec: "SHAPER.Special"
};
preLocalize("timePeriods");

/* -------------------------------------------- */

/**
 * TODO: Change to just major and minor action
 * 
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
SHAPER.abilityActivationTypes = {
  none: "SHAPER.None",
  major: "SHAPER.Major",
  minor: "SHAPER.Minor",
  counter: "SHAPER.Counter",
  minute: SHAPER.timePeriods.minute,
  hour: SHAPER.timePeriods.hour,
  day: SHAPER.timePeriods.day
};
preLocalize("abilityActivationTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Different things that an ability can consume upon use.
 * @enum {string}
 */
SHAPER.abilityConsumptionTypes = {
  ammo: "SHAPER.ConsumeAmmunition",
  attribute: "SHAPER.ConsumeAttribute",
  hitDice: "SHAPER.ConsumeHitDice",
  material: "SHAPER.ConsumeMaterial",
  charges: "SHAPER.ConsumeCharges"
};
preLocalize("abilityConsumptionTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Creature sizes.
 * @enum {string}
 */
SHAPER.actorSizes = {
  tiny: "SHAPER.SizeTiny",
  sm: "SHAPER.SizeSmall",
  med: "SHAPER.SizeMedium",
  lg: "SHAPER.SizeLarge",
  huge: "SHAPER.SizeHuge",
  grg: "SHAPER.SizeGargantuan"
};
preLocalize("actorSizes");

/**
 * Default token image size for the values of `SHAPER.actorSizes`.
 * @enum {number}
 */
SHAPER.tokenSizes = {
  tiny: 0.5,
  sm: 1,
  med: 1,
  lg: 2,
  huge: 3,
  grg: 4
};

/**
 * Colors used to visualize temporary and temporary maximum HP in token health bars.
 * @enum {number}
 */
SHAPER.tokenHPColors = {
  damage: 0xFF0000,
  healing: 0x00FF00,
  temp: 0x66CCFF,
  tempmax: 0x440066,
  negmax: 0x550000
};

/**
 * Classification types for item action types.
 * @enum {string}
 */
SHAPER.itemActionTypes = {
  mwak: "SHAPER.ActionMWAK",
  rwak: "SHAPER.ActionRWAK",
  msak: "SHAPER.ActionMSAK",
  rsak: "SHAPER.ActionRSAK",
  save: "SHAPER.ActionSave",
  heal: "SHAPER.ActionHeal",
  abil: "SHAPER.ActionAbil",
  util: "SHAPER.ActionUtil",
  other: "SHAPER.ActionOther"
};
preLocalize("itemActionTypes");

/* -------------------------------------------- */


/**
 * Enumerate the lengths of time over which an item can have limited use ability.
 * @enum {string}
 */
SHAPER.limitedUsePeriods = {
  sr: "SHAPER.ShortRest",
  lr: "SHAPER.LongRest",
  day: "SHAPER.Day",
  charges: "SHAPER.Charges"
};
preLocalize("limitedUsePeriods");


/**
 * The various types of vehicles in which characters can be proficient.
 * @enum {string}
 */
SHAPER.vehicleTypes = {
  air: "SHAPER.VehicleTypeAir",
  land: "SHAPER.VehicleTypeLand",
  space: "SHAPER.VehicleTypeSpace",
  water: "SHAPER.VehicleTypeWater"
};
preLocalize("vehicleTypes", { sort: true });

/* -------------------------------------------- */


/* -------------------------------------------- */

/**
 * The valid currency denominations with localized labels, abbreviations, and conversions.
 * @enum {{
 *   label: string,
 *   abbreviation: string,
 *   [conversion]: {into: string, each: number}
 * }}
 */
SHAPER.currencies = {
  pp: {
    label: "SHAPER.CurrencyPP",
    abbreviation: "SHAPER.CurrencyAbbrPP"
  },
  gp: {
    label: "SHAPER.CurrencyGP",
    abbreviation: "SHAPER.CurrencyAbbrGP",
    conversion: {into: "pp", each: 10}
  },
  ep: {
    label: "SHAPER.CurrencyEP",
    abbreviation: "SHAPER.CurrencyAbbrEP",
    conversion: {into: "gp", each: 2}
  },
  sp: {
    label: "SHAPER.CurrencySP",
    abbreviation: "SHAPER.CurrencyAbbrSP",
    conversion: {into: "ep", each: 5}
  },
  cp: {
    label: "SHAPER.CurrencyCP",
    abbreviation: "SHAPER.CurrencyAbbrCP",
    conversion: {into: "sp", each: 10}
  }
};
preLocalize("currencies", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */
/*  Damage Types                                */
/* -------------------------------------------- */

/**
 * Types of damage that are considered physical.
 * @enum {string}
 */
SHAPER.physicalDamageTypes = {
  bludgeoning: "SHAPER.DamageBludgeoning",
  piercing: "SHAPER.DamagePiercing",
  slashing: "SHAPER.DamageSlashing"
};
preLocalize("physicalDamageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage the can be caused by abilities.
 * @enum {string}
 */
SHAPER.damageTypes = {
  ...SHAPER.physicalDamageTypes,
  acid: "SHAPER.DamageAcid",
  cold: "SHAPER.DamageCold",
  fire: "SHAPER.DamageFire",
  force: "SHAPER.DamageForce",
  lightning: "SHAPER.DamageLightning",
  necrotic: "SHAPER.DamageNecrotic",
  poison: "SHAPER.DamagePoison",
  psychic: "SHAPER.DamagePsychic",
  radiant: "SHAPER.DamageRadiant",
  thunder: "SHAPER.DamageThunder"
};
preLocalize("damageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage to which an actor can possess resistance, immunity, or vulnerability.
 * @enum {string}
 * @deprecated
 */
SHAPER.damageResistanceTypes = {
  ...SHAPER.damageTypes,
  physical: "SHAPER.DamagePhysical"
};
preLocalize("damageResistanceTypes", { sort: true });

/* -------------------------------------------- */
/*  Movement                                    */
/* -------------------------------------------- */

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
SHAPER.movementTypes = {
  burrow: "SHAPER.MovementBurrow",
  climb: "SHAPER.MovementClimb",
  fly: "SHAPER.MovementFly",
  swim: "SHAPER.MovementSwim",
  walk: "SHAPER.MovementWalk"
};
preLocalize("movementTypes", { sort: true });

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
SHAPER.movementUnits = {
  ft: "SHAPER.DistFt",
  mi: "SHAPER.DistMi",
  m: "SHAPER.DistM",
  km: "SHAPER.DistKm"
};
preLocalize("movementUnits");

/**
 * The valid units of measure for the range of an action or effect.
 * This object automatically includes the movement units from `SHAPER.movementUnits`.
 * @enum {string}
 */
SHAPER.distanceUnits = {
  none: "SHAPER.None",
  self: "SHAPER.DistSelf",
  touch: "SHAPER.DistTouch",
  spec: "SHAPER.Special",
  any: "SHAPER.DistAny",
  ...SHAPER.movementUnits
};
preLocalize("distanceUnits");

/* -------------------------------------------- */

/**
 * Configure aspects of encumbrance calculation so that it could be configured by modules.
 * @enum {{ imperial: number, metric: number }}
 */
SHAPER.encumbrance = {
  currencyPerWeight: {
    imperial: 50,
    metric: 110
  },
  strMultiplier: {
    imperial: 15,
    metric: 6.8
  },
  vehicleWeightMultiplier: {
    imperial: 2000, // 2000 lbs in an imperial ton
    metric: 1000 // 1000 kg in a metric ton
  }
};

/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
SHAPER.targetTypes = {
  none: "SHAPER.None",
  self: "SHAPER.TargetSelf",
  creature: "SHAPER.TargetCreature",
  ally: "SHAPER.TargetAlly",
  enemy: "SHAPER.TargetEnemy",
  object: "SHAPER.TargetObject",
  space: "SHAPER.TargetSpace",
  radius: "SHAPER.TargetRadius",
  sphere: "SHAPER.TargetSphere",
  cylinder: "SHAPER.TargetCylinder",
  cone: "SHAPER.TargetCone",
  square: "SHAPER.TargetSquare",
  cube: "SHAPER.TargetCube",
  line: "SHAPER.TargetLine",
  wall: "SHAPER.TargetWall"
};
preLocalize("targetTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Mapping between `SHAPER.targetTypes` and `MeasuredTemplate` shape types to define
 * which templates are produced by which area of effect target type.
 * @enum {string}
 */
SHAPER.areaTargetTypes = {
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

/**
 * Different types of healing that can be applied using abilities.
 * @enum {string}
 */
SHAPER.healingTypes = {
  healing: "SHAPER.Healing",
  temphp: "SHAPER.HealingTemp"
};
preLocalize("healingTypes");

/* -------------------------------------------- */


/**
 * Various different ways a spell can be prepared.
 */
SHAPER.spellPreparationModes = {
  prepared: "SHAPER.SpellPrepPrepared",
  pact: "SHAPER.PactMagic",
  always: "SHAPER.SpellPrepAlways",
  atwill: "SHAPER.SpellPrepAtWill",
  innate: "SHAPER.SpellPrepInnate"
};
preLocalize("spellPreparationModes");

/**
 * Subset of `SHAPER.spellPreparationModes` that consume spell slots.
 * @type {boolean[]}
 */
SHAPER.spellUpcastModes = ["always", "pact", "prepared"];

/**
 * Ways in which a class can contribute to spellcasting levels.
 * @enum {string}
 */
SHAPER.spellProgression = {
  none: "SHAPER.SpellNone",
  full: "SHAPER.SpellProgFull",
  half: "SHAPER.SpellProgHalf",
  third: "SHAPER.SpellProgThird",
  pact: "SHAPER.SpellProgPact",
  artificer: "SHAPER.SpellProgArt"
};
preLocalize("spellProgression");

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed.
 * @enum {string}
 */
SHAPER.spellScalingModes = {
  none: "SHAPER.SpellNone",
  cantrip: "SHAPER.SpellCantrip",
  level: "SHAPER.SpellLevel"
};
preLocalize("spellScalingModes", { sort: true });


/* -------------------------------------------- */
/*  Spell Details                               */
/* -------------------------------------------- */

/**
 * Types of components that can be required when casting a spell.
 * @enum {object}
 */
SHAPER.spellComponents = {
  vocal: {
    label: "SHAPER.ComponentVerbal",
    abbr: "SHAPER.ComponentVerbalAbbr"
  },
  somatic: {
    label: "SHAPER.ComponentSomatic",
    abbr: "SHAPER.ComponentSomaticAbbr"
  },
  material: {
    label: "SHAPER.ComponentMaterial",
    abbr: "SHAPER.ComponentMaterialAbbr"
  }
};
preLocalize("spellComponents", {keys: ["label", "abbr"]});

/**
 * Supplementary rules keywords that inform a spell's use.
 * @enum {object}
 */
SHAPER.spellTags = {
  concentration: {
    label: "SHAPER.Concentration",
    abbr: "SHAPER.ConcentrationAbbr"
  },
  ritual: {
    label: "SHAPER.Ritual",
    abbr: "SHAPER.RitualAbbr"
  }
};
preLocalize("spellTags", {keys: ["label", "abbr"]});

/**
 * Schools to which a spell can belong.
 * @enum {string}
 */
SHAPER.spellSchools = {
  abj: "SHAPER.SchoolAbj",
  con: "SHAPER.SchoolCon",
  div: "SHAPER.SchoolDiv",
  enc: "SHAPER.SchoolEnc",
  evo: "SHAPER.SchoolEvo",
  ill: "SHAPER.SchoolIll",
  nec: "SHAPER.SchoolNec",
  trs: "SHAPER.SchoolTrs"
};
preLocalize("spellSchools", { sort: true });

/**
 * Valid spell levels.
 * @enum {string}
 */
SHAPER.spellLevels = {
  0: "SHAPER.SpellLevel0",
  1: "SHAPER.SpellLevel1",
  2: "SHAPER.SpellLevel2",
  3: "SHAPER.SpellLevel3",
  4: "SHAPER.SpellLevel4",
  5: "SHAPER.SpellLevel5",
  6: "SHAPER.SpellLevel6",
  7: "SHAPER.SpellLevel7",
  8: "SHAPER.SpellLevel8",
  9: "SHAPER.SpellLevel9"
};
preLocalize("spellLevels");

/**
 * Spell scroll item ID within the `SHAPER.sourcePacks` compendium for each level.
 * @enum {string}
 */
SHAPER.spellScrollIds = {
  0: "rQ6sO7HDWzqMhSI3",
  1: "9GSfMg0VOA2b4uFN",
  2: "XdDp6CKh9qEvPTuS",
  3: "hqVKZie7x9w3Kqds",
  4: "DM7hzgL836ZyUFB1",
  5: "wa1VF8TXHmkrrR35",
  6: "tI3rWx4bxefNCexS",
  7: "mtyw4NS1s7j2EJaD",
  8: "aOrinPg7yuDZEuWr",
  9: "O4YbkJkLlnsgUszZ"
};

/**
 * Compendium packs used for localized items.
 * @enum {string}
 */
SHAPER.sourcePacks = {
  ITEMS: "shaper.items"
};

/**
 * Define the standard slot progression by character level.
 * The entries of this array represent the spell slot progression for a full spell-caster.
 * @type {number[][]}
 */
SHAPER.SPELL_SLOT_TABLE = [
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

/**
 * Settings to configure how actors are merged when polymorphing is applied.
 * @enum {string}
 */
SHAPER.polymorphSettings = {
  keepPhysical: "SHAPER.PolymorphKeepPhysical",
  keepMental: "SHAPER.PolymorphKeepMental",
  keepSaves: "SHAPER.PolymorphKeepSaves",
  keepSkills: "SHAPER.PolymorphKeepSkills",
  mergeSaves: "SHAPER.PolymorphMergeSaves",
  mergeSkills: "SHAPER.PolymorphMergeSkills",
  keepClass: "SHAPER.PolymorphKeepClass",
  keepFeats: "SHAPER.PolymorphKeepFeats",
  keepSpells: "SHAPER.PolymorphKeepSpells",
  keepItems: "SHAPER.PolymorphKeepItems",
  keepBio: "SHAPER.PolymorphKeepBio",
  keepVision: "SHAPER.PolymorphKeepVision"
};
preLocalize("polymorphSettings", { sort: true });

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels.
 * The key for each level represents its proficiency multiplier.
 * @enum {string}
 */
SHAPER.proficiencyLevels = {
  0: "SHAPER.NotProficient",
  1: "SHAPER.Proficient",
  0.5: "SHAPER.HalfProficient",
  2: "SHAPER.Expertise"
};
preLocalize("proficiencyLevels");

/* -------------------------------------------- */

/**
 * The amount of cover provided by an object. In cases where multiple pieces
 * of cover are in play, we take the highest value.
 * @enum {string}
 */
SHAPER.cover = {
  0: "SHAPER.None",
  .5: "SHAPER.CoverHalf",
  .75: "SHAPER.CoverThreeQuarters",
  1: "SHAPER.CoverTotal"
};
preLocalize("cover");

/* -------------------------------------------- */

/**
 * A selection of actor attributes that can be tracked on token resource bars.
 * @type {string[]}
 */
SHAPER.trackableAttributes = [
  "attributes.init.value", "attributes.movement", "details.xp.value", "skills.*.passive",
  "abilities.*.value"
];

/* -------------------------------------------- */


/* -------------------------------------------- */

/**
 * Conditions that can effect an actor.
 * @enum {string}
 */
SHAPER.conditionTypes = {
  blinded: "SHAPER.ConBlinded",
  charmed: "SHAPER.ConCharmed",
  deafened: "SHAPER.ConDeafened",
  diseased: "SHAPER.ConDiseased",
  exhaustion: "SHAPER.ConExhaustion",
  frightened: "SHAPER.ConFrightened",
  grappled: "SHAPER.ConGrappled",
  incapacitated: "SHAPER.ConIncapacitated",
  invisible: "SHAPER.ConInvisible",
  paralyzed: "SHAPER.ConParalyzed",
  petrified: "SHAPER.ConPetrified",
  poisoned: "SHAPER.ConPoisoned",
  prone: "SHAPER.ConProne",
  restrained: "SHAPER.ConRestrained",
  stunned: "SHAPER.ConStunned",
  unconscious: "SHAPER.ConUnconscious"
};
preLocalize("conditionTypes", { sort: true });

/**
 * Languages a character can learn.
 * @enum {string}
 */
SHAPER.languages = {
  common: "SHAPER.LanguagesCommon",
  aarakocra: "SHAPER.LanguagesAarakocra",
  abyssal: "SHAPER.LanguagesAbyssal",
  aquan: "SHAPER.LanguagesAquan",
  auran: "SHAPER.LanguagesAuran",
  celestial: "SHAPER.LanguagesCelestial",
  deep: "SHAPER.LanguagesDeepSpeech",
  draconic: "SHAPER.LanguagesDraconic",
  druidic: "SHAPER.LanguagesDruidic",
  dwarvish: "SHAPER.LanguagesDwarvish",
  elvish: "SHAPER.LanguagesElvish",
  giant: "SHAPER.LanguagesGiant",
  gith: "SHAPER.LanguagesGith",
  gnomish: "SHAPER.LanguagesGnomish",
  goblin: "SHAPER.LanguagesGoblin",
  gnoll: "SHAPER.LanguagesGnoll",
  halfling: "SHAPER.LanguagesHalfling",
  ignan: "SHAPER.LanguagesIgnan",
  infernal: "SHAPER.LanguagesInfernal",
  orc: "SHAPER.LanguagesOrc",
  primordial: "SHAPER.LanguagesPrimordial",
  sylvan: "SHAPER.LanguagesSylvan",
  terran: "SHAPER.LanguagesTerran",
  cant: "SHAPER.LanguagesThievesCant",
  undercommon: "SHAPER.LanguagesUndercommon"
};
preLocalize("languages", { sort: true });

/**
 * Maximum allowed character level.
 * @type {number}
 */
SHAPER.maxLevel = 20;

/**
 * XP required to achieve each character level.
 * @type {number[]}
 */
SHAPER.CHARACTER_EXP_LEVELS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/**
 * XP granted for each challenge rating.
 * @type {number[]}
 */
SHAPER.CR_EXP_LEVELS = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
  20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
];


/**
 * Special character flags.
 * @enum {{
 *   name: string,
 *   hint: string,
 *   [abilities]: string[],
 *   [choices]: object<string, string>,
 *   [skills]: string[],
 *   section: string,
 *   type: any,
 *   placeholder: any
 * }}
 */
SHAPER.characterFlags = {
  diamondSoul: {
    name: "SHAPER.FlagsDiamondSoul",
    hint: "SHAPER.FlagsDiamondSoulHint",
    section: "SHAPER.Feats",
    type: Boolean
  },
  elvenAccuracy: {
    name: "SHAPER.FlagsElvenAccuracy",
    hint: "SHAPER.FlagsElvenAccuracyHint",
    section: "SHAPER.RacialTraits",
    abilities: ["dex", "int", "wis", "cha"],
    type: Boolean
  },
  halflingLucky: {
    name: "SHAPER.FlagsHalflingLucky",
    hint: "SHAPER.FlagsHalflingLuckyHint",
    section: "SHAPER.RacialTraits",
    type: Boolean
  },
  initiativeAdv: {
    name: "SHAPER.FlagsInitiativeAdv",
    hint: "SHAPER.FlagsInitiativeAdvHint",
    section: "SHAPER.Feats",
    type: Boolean
  },
  initiativeAlert: {
    name: "SHAPER.FlagsAlert",
    hint: "SHAPER.FlagsAlertHint",
    section: "SHAPER.Feats",
    type: Boolean
  },
  jackOfAllTrades: {
    name: "SHAPER.FlagsJOAT",
    hint: "SHAPER.FlagsJOATHint",
    section: "SHAPER.Feats",
    type: Boolean
  },
  observantFeat: {
    name: "SHAPER.FlagsObservant",
    hint: "SHAPER.FlagsObservantHint",
    skills: ["prc", "inv"],
    section: "SHAPER.Feats",
    type: Boolean
  },
  powerfulBuild: {
    name: "SHAPER.FlagsPowerfulBuild",
    hint: "SHAPER.FlagsPowerfulBuildHint",
    section: "SHAPER.RacialTraits",
    type: Boolean
  },
  reliableTalent: {
    name: "SHAPER.FlagsReliableTalent",
    hint: "SHAPER.FlagsReliableTalentHint",
    section: "SHAPER.Feats",
    type: Boolean
  },
  remarkableAthlete: {
    name: "SHAPER.FlagsRemarkableAthlete",
    hint: "SHAPER.FlagsRemarkableAthleteHint",
    abilities: ["str", "dex", "con"],
    section: "SHAPER.Feats",
    type: Boolean
  },
  weaponCriticalThreshold: {
    name: "SHAPER.FlagsWeaponCritThreshold",
    hint: "SHAPER.FlagsWeaponCritThresholdHint",
    section: "SHAPER.Feats",
    type: Number,
    placeholder: 20
  },
  spellCriticalThreshold: {
    name: "SHAPER.FlagsSpellCritThreshold",
    hint: "SHAPER.FlagsSpellCritThresholdHint",
    section: "SHAPER.Feats",
    type: Number,
    placeholder: 20
  },
  meleeCriticalDamageDice: {
    name: "SHAPER.FlagsMeleeCriticalDice",
    hint: "SHAPER.FlagsMeleeCriticalDiceHint",
    section: "SHAPER.Feats",
    type: Number,
    placeholder: 0
  }
};
preLocalize("characterFlags", { keys: ["name", "hint", "section"] });

/**
 * Flags allowed on actors. Any flags not in the list may be deleted during a migration.
 * @type {string[]}
 */
SHAPER.allowedActorFlags = ["isPolymorphed", "originalActor"].concat(Object.keys(SHAPER.characterFlags));

/* -------------------------------------------- */

/**
 * Patch an existing config enum to allow conversion from string values to object values without
 * breaking existing modules that are expecting strings.
 * @param {string} key          Key within SHAPER that has been replaced with an enum of objects.
 * @param {string} fallbackKey  Key within the new config object from which to get the fallback value.
 * @param {object} [options]    Additional options passed through to logCompatibilityWarning.
 */
function patchConfig(key, fallbackKey, options) {
  /** @override */
  function toString() {
    const message = `The value of CONFIG.SHAPER.${key} has been changed to an object.`
      +` The former value can be acccessed from .${fallbackKey}.`;
    foundry.utils.logCompatibilityWarning(message, options);
    return this[fallbackKey];
  }

  Object.values(SHAPER[key]).forEach(o => o.toString = toString);
}

/* -------------------------------------------- */

export default SHAPER;
