import { patchConfig, preLocalize } from "./utils.mjs";

/* -------------------------------------------- */
/*  Abilities                                   */
/* -------------------------------------------- */

/**
 * The set of Ability Scores used within the system.
 * @enum {string}
 */
export const abilities = {
  str: "DND5E.AbilityStr",
  dex: "DND5E.AbilityDex",
  con: "DND5E.AbilityCon",
  int: "DND5E.AbilityInt",
  wis: "DND5E.AbilityWis",
  cha: "DND5E.AbilityCha",
  hon: "DND5E.AbilityHon",
  san: "DND5E.AbilitySan"
};
preLocalize("abilities");

/**
 * Localized abbreviations for Ability Scores.
 * @enum {string}
 */
export const abilityAbbreviations = {
  str: "DND5E.AbilityStrAbbr",
  dex: "DND5E.AbilityDexAbbr",
  con: "DND5E.AbilityConAbbr",
  int: "DND5E.AbilityIntAbbr",
  wis: "DND5E.AbilityWisAbbr",
  cha: "DND5E.AbilityChaAbbr",
  hon: "DND5E.AbilityHonAbbr",
  san: "DND5E.AbilitySanAbbr"
};
preLocalize("abilityAbbreviations");

/* -------------------------------------------- */
/*  Skills                                      */
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
export const skills = {
  acr: { label: "DND5E.SkillAcr", ability: "dex" },
  ani: { label: "DND5E.SkillAni", ability: "wis" },
  arc: { label: "DND5E.SkillArc", ability: "int" },
  ath: { label: "DND5E.SkillAth", ability: "str" },
  dec: { label: "DND5E.SkillDec", ability: "cha" },
  his: { label: "DND5E.SkillHis", ability: "int" },
  ins: { label: "DND5E.SkillIns", ability: "wis" },
  itm: { label: "DND5E.SkillItm", ability: "cha" },
  inv: { label: "DND5E.SkillInv", ability: "int" },
  med: { label: "DND5E.SkillMed", ability: "wis" },
  nat: { label: "DND5E.SkillNat", ability: "int" },
  prc: { label: "DND5E.SkillPrc", ability: "wis" },
  prf: { label: "DND5E.SkillPrf", ability: "cha" },
  per: { label: "DND5E.SkillPer", ability: "cha" },
  rel: { label: "DND5E.SkillRel", ability: "int" },
  slt: { label: "DND5E.SkillSlt", ability: "dex" },
  ste: { label: "DND5E.SkillSte", ability: "dex" },
  sur: { label: "DND5E.SkillSur", ability: "wis" }
};
preLocalize("skills", { key: "label", sort: true });
patchConfig("skills", skills, "label", { since: 2.0, until: 2.2 });

/* -------------------------------------------- */
/*  Other Traits                                */
/* -------------------------------------------- */

/**
 * Character alignment options.
 * @enum {string}
 */
export const alignments = {
  lg: "DND5E.AlignmentLG",
  ng: "DND5E.AlignmentNG",
  cg: "DND5E.AlignmentCG",
  ln: "DND5E.AlignmentLN",
  tn: "DND5E.AlignmentTN",
  cn: "DND5E.AlignmentCN",
  le: "DND5E.AlignmentLE",
  ne: "DND5E.AlignmentNE",
  ce: "DND5E.AlignmentCE"
};
preLocalize("alignments");

/* -------------------------------------------- */

/**
 * Conditions that can effect an actor.
 * @enum {string}
 */
export const conditionTypes = {
  blinded: "DND5E.ConBlinded",
  charmed: "DND5E.ConCharmed",
  deafened: "DND5E.ConDeafened",
  diseased: "DND5E.ConDiseased",
  exhaustion: "DND5E.ConExhaustion",
  frightened: "DND5E.ConFrightened",
  grappled: "DND5E.ConGrappled",
  incapacitated: "DND5E.ConIncapacitated",
  invisible: "DND5E.ConInvisible",
  paralyzed: "DND5E.ConParalyzed",
  petrified: "DND5E.ConPetrified",
  poisoned: "DND5E.ConPoisoned",
  prone: "DND5E.ConProne",
  restrained: "DND5E.ConRestrained",
  stunned: "DND5E.ConStunned",
  unconscious: "DND5E.ConUnconscious"
};
preLocalize("conditionTypes", { sort: true });

/* -------------------------------------------- */

/**
 * The amount of cover provided by an object. In cases where multiple pieces
 * of cover are in play, we take the highest value.
 * @enum {string}
 */
export const cover = {
  0: "DND5E.None",
  .5: "DND5E.CoverHalf",
  .75: "DND5E.CoverThreeQuarters",
  1: "DND5E.CoverTotal"
};
preLocalize("cover");

/* -------------------------------------------- */

/**
 * Default types of creatures.
 * *Note: Not pre-localized to allow for easy fetching of pluralized forms.*
 * @enum {string}
 */
export const creatureTypes = {
  aberration: "DND5E.CreatureAberration",
  beast: "DND5E.CreatureBeast",
  celestial: "DND5E.CreatureCelestial",
  construct: "DND5E.CreatureConstruct",
  dragon: "DND5E.CreatureDragon",
  elemental: "DND5E.CreatureElemental",
  fey: "DND5E.CreatureFey",
  fiend: "DND5E.CreatureFiend",
  giant: "DND5E.CreatureGiant",
  humanoid: "DND5E.CreatureHumanoid",
  monstrosity: "DND5E.CreatureMonstrosity",
  ooze: "DND5E.CreatureOoze",
  plant: "DND5E.CreaturePlant",
  undead: "DND5E.CreatureUndead"
};

/* -------------------------------------------- */

/**
 * Configure aspects of encumbrance calculation so that it could be configured by modules.
 * @enum {{ imperial: number, metric: number }}
 */
export const encumbrance = {
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
 * Denominations of hit dice which can apply to classes.
 * @type {string[]}
 */
export const hitDieTypes = ["d4", "d6", "d8", "d10", "d12"];

/* -------------------------------------------- */

/**
 * Languages a character can learn.
 * @enum {string}
 */
export const languages = {
  common: "DND5E.LanguagesCommon",
  aarakocra: "DND5E.LanguagesAarakocra",
  abyssal: "DND5E.LanguagesAbyssal",
  aquan: "DND5E.LanguagesAquan",
  auran: "DND5E.LanguagesAuran",
  celestial: "DND5E.LanguagesCelestial",
  deep: "DND5E.LanguagesDeepSpeech",
  draconic: "DND5E.LanguagesDraconic",
  druidic: "DND5E.LanguagesDruidic",
  dwarvish: "DND5E.LanguagesDwarvish",
  elvish: "DND5E.LanguagesElvish",
  giant: "DND5E.LanguagesGiant",
  gith: "DND5E.LanguagesGith",
  gnomish: "DND5E.LanguagesGnomish",
  goblin: "DND5E.LanguagesGoblin",
  gnoll: "DND5E.LanguagesGnoll",
  halfling: "DND5E.LanguagesHalfling",
  ignan: "DND5E.LanguagesIgnan",
  infernal: "DND5E.LanguagesInfernal",
  orc: "DND5E.LanguagesOrc",
  primordial: "DND5E.LanguagesPrimordial",
  sylvan: "DND5E.LanguagesSylvan",
  terran: "DND5E.LanguagesTerran",
  cant: "DND5E.LanguagesThievesCant",
  undercommon: "DND5E.LanguagesUndercommon"
};
preLocalize("languages", { sort: true });

/* -------------------------------------------- */

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
export const movementTypes = {
  burrow: "DND5E.MovementBurrow",
  climb: "DND5E.MovementClimb",
  fly: "DND5E.MovementFly",
  swim: "DND5E.MovementSwim",
  walk: "DND5E.MovementWalk"
};
preLocalize("movementTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Settings to configure how actors are merged when polymorphing is applied.
 * @enum {string}
 */
export const polymorphSettings = {
  keepPhysical: "DND5E.PolymorphKeepPhysical",
  keepMental: "DND5E.PolymorphKeepMental",
  keepSaves: "DND5E.PolymorphKeepSaves",
  keepSkills: "DND5E.PolymorphKeepSkills",
  mergeSaves: "DND5E.PolymorphMergeSaves",
  mergeSkills: "DND5E.PolymorphMergeSkills",
  keepClass: "DND5E.PolymorphKeepClass",
  keepFeats: "DND5E.PolymorphKeepFeats",
  keepSpells: "DND5E.PolymorphKeepSpells",
  keepItems: "DND5E.PolymorphKeepItems",
  keepBio: "DND5E.PolymorphKeepBio",
  keepVision: "DND5E.PolymorphKeepVision"
};
preLocalize("polymorphSettings", { sort: true });

/* -------------------------------------------- */

/**
 * The set of possible sensory perception types which an Actor may have.
 * @enum {string}
 */
export const senses = {
  blindsight: "DND5E.SenseBlindsight",
  darkvision: "DND5E.SenseDarkvision",
  tremorsense: "DND5E.SenseTremorsense",
  truesight: "DND5E.SenseTruesight"
};
preLocalize("senses", { sort: true });

/* -------------------------------------------- */
/*  Flags & Resources                           */
/* -------------------------------------------- */

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
export const characterFlags = {
  diamondSoul: {
    name: "DND5E.FlagsDiamondSoul",
    hint: "DND5E.FlagsDiamondSoulHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  elvenAccuracy: {
    name: "DND5E.FlagsElvenAccuracy",
    hint: "DND5E.FlagsElvenAccuracyHint",
    section: "DND5E.RacialTraits",
    abilities: ["dex", "int", "wis", "cha"],
    type: Boolean
  },
  halflingLucky: {
    name: "DND5E.FlagsHalflingLucky",
    hint: "DND5E.FlagsHalflingLuckyHint",
    section: "DND5E.RacialTraits",
    type: Boolean
  },
  initiativeAdv: {
    name: "DND5E.FlagsInitiativeAdv",
    hint: "DND5E.FlagsInitiativeAdvHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  initiativeAlert: {
    name: "DND5E.FlagsAlert",
    hint: "DND5E.FlagsAlertHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  jackOfAllTrades: {
    name: "DND5E.FlagsJOAT",
    hint: "DND5E.FlagsJOATHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  observantFeat: {
    name: "DND5E.FlagsObservant",
    hint: "DND5E.FlagsObservantHint",
    skills: ["prc", "inv"],
    section: "DND5E.Feats",
    type: Boolean
  },
  powerfulBuild: {
    name: "DND5E.FlagsPowerfulBuild",
    hint: "DND5E.FlagsPowerfulBuildHint",
    section: "DND5E.RacialTraits",
    type: Boolean
  },
  reliableTalent: {
    name: "DND5E.FlagsReliableTalent",
    hint: "DND5E.FlagsReliableTalentHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  remarkableAthlete: {
    name: "DND5E.FlagsRemarkableAthlete",
    hint: "DND5E.FlagsRemarkableAthleteHint",
    abilities: ["str", "dex", "con"],
    section: "DND5E.Feats",
    type: Boolean
  },
  weaponCriticalThreshold: {
    name: "DND5E.FlagsWeaponCritThreshold",
    hint: "DND5E.FlagsWeaponCritThresholdHint",
    section: "DND5E.Feats",
    type: Number,
    placeholder: 20
  },
  spellCriticalThreshold: {
    name: "DND5E.FlagsSpellCritThreshold",
    hint: "DND5E.FlagsSpellCritThresholdHint",
    section: "DND5E.Feats",
    type: Number,
    placeholder: 20
  },
  meleeCriticalDamageDice: {
    name: "DND5E.FlagsMeleeCriticalDice",
    hint: "DND5E.FlagsMeleeCriticalDiceHint",
    section: "DND5E.Feats",
    type: Number,
    placeholder: 0
  }
};
preLocalize("characterFlags", { keys: ["name", "hint", "section"] });

/* -------------------------------------------- */

/**
 * Flags allowed on actors. Any flags not in the list may be deleted during a migration.
 * @type {string[]}
 */
export const allowedActorFlags = [
  "isPolymorphed",
  "originalActor",
  ...Object.keys(characterFlags)
];

/* -------------------------------------------- */

/**
 * A selection of actor attributes that can be tracked on token resource bars.
 * @type {string[]}
 */
export const trackableAttributes = [
  "attributes.ac.value", "attributes.init.value", "attributes.movement", "attributes.senses", "attributes.spelldc",
  "attributes.spellLevel", "details.cr", "details.spellLevel", "details.xp.value", "skills.*.passive",
  "abilities.*.value"
];

/* -------------------------------------------- */

/**
 * A selection of actor and item attributes that are valid targets for item resource consumption.
 * @type {string[]}
 */
export const consumableResources = [
  "item.quantity", "item.weight", "item.duration.value", "currency", "details.xp.value", "abilities.*.value",
  "attributes.senses", "attributes.movement", "attributes.ac.flat", "item.armor.value", "item.target", "item.range",
  "item.save.dc"
];

/* -------------------------------------------- */
/*  Levels                                      */
/* -------------------------------------------- */

/**
 * XP required to achieve each character level.
 * @type {number[]}
 */
export const CHARACTER_EXP_LEVELS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/* -------------------------------------------- */

/**
 * XP granted for each challenge rating.
 * @type {number[]}
 */
export const CR_EXP_LEVELS = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
  20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
];

/* -------------------------------------------- */

/**
 * Maximum allowed character level.
 * @type {number}
 */
export const maxLevel = 20;

/* -------------------------------------------- */
/*  Sizes & Tokens                              */
/* -------------------------------------------- */

/**
 * Creature sizes.
 * @enum {string}
 */
export const actorSizes = {
  tiny: "DND5E.SizeTiny",
  sm: "DND5E.SizeSmall",
  med: "DND5E.SizeMedium",
  lg: "DND5E.SizeLarge",
  huge: "DND5E.SizeHuge",
  grg: "DND5E.SizeGargantuan"
};
preLocalize("actorSizes");

/* -------------------------------------------- */

/**
 * Default token image size for the values of `DND5E.actorSizes`.
 * @enum {number}
 */
export const tokenSizes = {
  tiny: 0.5,
  sm: 1,
  med: 1,
  lg: 2,
  huge: 3,
  grg: 4
};

/* -------------------------------------------- */

/**
 * Colors used to visualize temporary and temporary maximum HP in token health bars.
 * @enum {number}
 */
export const tokenHPColors = {
  damage: 0xFF0000,
  healing: 0x00FF00,
  temp: 0x66CCFF,
  tempmax: 0x440066,
  negmax: 0x550000
};
