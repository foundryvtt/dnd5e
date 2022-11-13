import { preLocalize } from "./utils.mjs";

// Namespace Configuration Values
const SHAPER = {};

// ASCII Artwork
SHAPER.ASCII = `
__███████╗████████╗_██████╗_██████╗_██╗___██╗___
__██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗_██╔╝___
__███████╗___██║___██║___██║██████╔╝_╚████╔╝____
__╚════██║___██║___██║___██║██╔══██╗__╚██╔╝_____
__███████║___██║___╚██████╔╝██║__██║___██║______
__╚══════╝___╚═╝____╚═════╝_╚═╝__╚═╝___╚═╝______
________________________________________________
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
  acr: { label: "SHAPER.SkillAcr", ability0: "str", ability1: "fin" },
  ath: { label: "SHAPER.SkillAth", ability0: "str", ability1: "tgh" },
  ani: { label: "SHAPER.SkillAni", ability0: "hrt", ability1: "sol" },
  awa: { label: "SHAPER.SkillAwa", ability0: "mnd", ability1: "sol" },
  cmp: { label: "SHAPER.SkillCmp", ability0: "tgh", ability1: "sol" },
  con: { label: "SHAPER.SkillCon", ability0: "tgh", ability1: "mnd" },
  cft: { label: "SHAPER.SkillCft", ability0: "fin", ability1: "mnd" },
  dec: { label: "SHAPER.SkillDec", ability0: "mnd", ability1: "hrt" },
  dip: { label: "SHAPER.SkillDip", ability0: "hrt", ability1: "sol" },
  drv: { label: "SHAPER.SkillDrv", ability0: "fin", ability1: "mnd" },
  emp: { label: "SHAPER.SkillEmp", ability0: "hrt", ability1: "sol" },
  end: { label: "SHAPER.SkillEnd", ability0: "tgh", ability1: "hrt" },
  int: { label: "SHAPER.SkillInt", ability0: "str", ability1: "hrt" },
  inv: { label: "SHAPER.SkillInv", ability0: "mnd", ability1: "sol" },
  lor: { label: "SHAPER.SkillLor", ability0: "mnd", ability1: "sol" },
  med: { label: "SHAPER.SkillMed", ability0: "mnd", ability1: "fin" },
  per: { label: "SHAPER.SkillPer", ability0: "fin", ability1: "hrt" },
  sab: { label: "SHAPER.SkillSab", ability0: "fin", ability1: "mnd" },
  sci: { label: "SHAPER.SkillSci", ability0: "mnd", ability1: "sol" },
  stl: { label: "SHAPER.SkillStl", ability0: "fin", ability1: "mnd" },
  stw: { label: "SHAPER.SkillStw", ability0: "mnd", ability1: "hrt" },
  sur: { label: "SHAPER.SkillSur", ability0: "mnd", ability1: "sol" },
  tch: { label: "SHAPER.SkillTch", ability0: "fin", ability1: "mnd" }
};
preLocalize("skills", { key: "label", sort: true });
patchConfig("skills", "label", { since: 2.0, until: 2.2 });


/**
 * The set of Point Stats used within the system.
 * @enum {string}
 */
 SHAPER.stats = {
  physO: "SHAPER.StatPhyso",
  menO: "SHAPER.StatMeno",
  physD: "SHAPER.StatPhysd",
  menD: "SHAPER.StatMend"
};
preLocalize("stats");

/**
 * The set of Counters used within the system.
 * @enum {string}
 */
 SHAPER.counts = {
  injury: "SHAPER.Injury",
  obuff: "SHAPER.OBuff",
  dbuff: "SHAPER.DBuff"
};
preLocalize("counts");

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
 * 
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
SHAPER.abilityActivationTypes = {
  none: "SHAPER.None",
  major: "SHAPER.MajorAction",
  minor: "SHAPER.MinorAction",
  counter: "SHAPER.CounterAction"
};
preLocalize("abilityActivationTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Different things that an ability can consume upon use.
 * @enum {string}
 */
SHAPER.abilityConsumptionTypes = {
  attribute: "SHAPER.ConsumeAttribute"
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
  tiny: 0.5*.5,
  sm: 1*.5,
  med: 1*.5,
  lg: 2*.5,
  huge: 3*.5,
  grg: 4*.5
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
  attack: "SHAPER.ActionAttack",
  spell: "SHAPER.ActionSpell",
  aux: "SHAPER.ActionAuxillary",
  heal: "SHAPER.ActionHeal"
};
preLocalize("itemActionTypes");

/* -------------------------------------------- */

/* -------------------------------------------- */
/*  Damage Types                                */
/* -------------------------------------------- */

/**
 * Types of damage that are considered physical.
 * @enum {string}
 */
SHAPER.physicalDamageTypes = {
  physical: "SHAPER.DamagePhysical"
};
preLocalize("physicalDamageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage the can be caused by abilities.
 * @enum {string}
 */
SHAPER.damageTypes = {
  ...SHAPER.physicalDamageTypes,
  ice: "SHAPER.DamageIce",
  fire: "SHAPER.DamageFire",
  earth: "SHAPER.DamageEarth",
  sky: "SHAPER.DamageSky",
  light: "SHAPER.DamageLight",
  dark: "SHAPER.DamageDark",
  almighty: "SHAPER.DamageAlmighty"
};
preLocalize("damageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage to which an actor can possess resistance, immunity, or vulnerability.
 * @enum {string}
 * @deprecated
 */
SHAPER.damageResistanceTypes = {
  ...SHAPER.damageTypes
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
  walk: "SHAPER.MovementWalk"
};
preLocalize("movementTypes", { sort: true });

/**
 * The valid units of measure for movement distances in the game system.
 * @enum {string}
 */
SHAPER.movementUnits = {
  sq: "SHAPER.DistSq"
};
preLocalize("movementUnits");

/**
 * The valid units of measure for the range of an action or effect.
 * @enum {string}
 */
SHAPER.distanceUnits = {
  none: "SHAPER.None",
  melee: "SHAPER.DistMelee",
  short: "SHAPER.DistShort",
  medium: "SHAPER.DistMedium",
  long: "SHAPER.DistLong",
  extreme: "SHAPER.DistExtreme"
};
preLocalize("distanceUnits");


/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
SHAPER.targetTypes = {
  none: "SHAPER.None",
  self: "SHAPER.TargetSelf",
  ally: "SHAPER.TargetAlly",
  enemy: "SHAPER.TargetEnemy",
  space: "SHAPER.TargetSpace"
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
  healing: "SHAPER.Healing"
};
preLocalize("healingTypes");

/* -------------------------------------------- */

/**
 * Compendium packs used for localized items.
 * @enum {string}
 */
SHAPER.sourcePacks = {
  ITEMS: "shaper.items"
};


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
  "attributes.init.value", "attributes.hp.value", "attributes.mp.value", "details.xp.value"
];

/* -------------------------------------------- */

/**
 * A selection of actor and item attributes that are valid targets for item resource consumption.
 * @type {string[]}
 */
 SHAPER.consumableResources = [
  "attributes.hp.value",
  "attributes.mp.value"
];

/* -------------------------------------------- */

/**
 * A selection of actor and item attributes that are valid targets for item resource consumption.
 * @enum {string}
 */
 SHAPER.consumeTargets = {
  hp: "SHAPER.HP",
  mp: "SHAPER.MP"
 };
 preLocalize("consumeTargets", { sort: true });

/* -------------------------------------------- */

/**
 * Conditions that can effect an actor.
 * @enum {string}
 */
SHAPER.conditionTypes = {
  blind: "SHAPER.ConBlind",
  daze: "SHAPER.ConDaze",
  degeneration: "SHAPER.ConDegeneration",
  provoke: "SHAPER.ConProvoke",
  root: "SHAPER.ConRoot",
  slow: "SHAPER.ConSlow",
  stagger: "SHAPER.ConStagger"
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
  weaponCriticalThreshold: {
    name: "SHAPER.FlagsWeaponCritThreshold",
    hint: "SHAPER.FlagsWeaponCritThresholdHint",
    section: "SHAPER.Feats",
    type: Number,
    placeholder: 20
  }
};
preLocalize("characterFlags", { keys: ["name", "hint", "section"] });



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
