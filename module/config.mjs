import MapLocationControlIcon from "./canvas/map-location-control-icon.mjs";
import { ConsumptionTargetData } from "./data/activity/fields/consumption-targets-field.mjs";
import TransformationSetting from "./data/settings/transformation-setting.mjs";
import * as activities from "./documents/activity/_module.mjs";
import Actor5e from "./documents/actor/actor.mjs";
import * as advancement from "./documents/advancement/_module.mjs";
import { preLocalize } from "./utils.mjs";
import MappingField from "./data/fields/mapping-field.mjs";

/**
 * @import { TravelPace5e } from "./data/shared/movement-field.mjs";
 */

// Namespace Configuration Values
const DND5E = {};

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
 * Configuration data for abilities.
 *
 * @typedef {object} AbilityConfiguration
 * @property {string} label                               Localized label.
 * @property {string} abbreviation                        Localized abbreviation.
 * @property {string} fullKey                             Fully written key used as alternate for enrichers.
 * @property {string} [reference]                         Reference to a rule page describing this ability.
 * @property {string} [type]                              Whether this is a "physical" or "mental" ability.
 * @property {Object<string, number|string>}  [defaults]  Default values for this ability based on actor type.
 *                                                        If a string is used, the system will attempt to fetch.
 *                                                        the value of the specified ability.
 * @property {string} [icon]                              An SVG icon that represents the ability.
 */

/**
 * The set of Ability Scores used within the system.
 * @enum {AbilityConfiguration}
 */
DND5E.abilities = {
  str: {
    label: "DND5E.AbilityStr",
    abbreviation: "DND5E.AbilityStrAbbr",
    type: "physical",
    fullKey: "strength",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.nUPv6C66Ur64BIUH",
    icon: "systems/dnd5e/icons/svg/abilities/strength.svg"
  },
  dex: {
    label: "DND5E.AbilityDex",
    abbreviation: "DND5E.AbilityDexAbbr",
    type: "physical",
    fullKey: "dexterity",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ER8CKDUWLsFXuARJ",
    icon: "systems/dnd5e/icons/svg/abilities/dexterity.svg"
  },
  con: {
    label: "DND5E.AbilityCon",
    abbreviation: "DND5E.AbilityConAbbr",
    type: "physical",
    fullKey: "constitution",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.MpA4jnwD17Q0RPg7",
    icon: "systems/dnd5e/icons/svg/abilities/constitution.svg"
  },
  int: {
    label: "DND5E.AbilityInt",
    abbreviation: "DND5E.AbilityIntAbbr",
    type: "mental",
    fullKey: "intelligence",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.WzWWcTIppki35YvF",
    icon: "systems/dnd5e/icons/svg/abilities/intelligence.svg",
    defaults: { vehicle: 0 }
  },
  wis: {
    label: "DND5E.AbilityWis",
    abbreviation: "DND5E.AbilityWisAbbr",
    type: "mental",
    fullKey: "wisdom",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.v3IPyTtqvXqN934s",
    icon: "systems/dnd5e/icons/svg/abilities/wisdom.svg",
    defaults: { vehicle: 0 }
  },
  cha: {
    label: "DND5E.AbilityCha",
    abbreviation: "DND5E.AbilityChaAbbr",
    type: "mental",
    fullKey: "charisma",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.9FyghudYFV5QJOuG",
    icon: "systems/dnd5e/icons/svg/abilities/charisma.svg",
    defaults: { vehicle: 0 }
  },
  hon: {
    label: "DND5E.AbilityHon",
    abbreviation: "DND5E.AbilityHonAbbr",
    type: "mental",
    fullKey: "honor",
    defaults: { npc: "cha", vehicle: 0 },
    improvement: false
  },
  san: {
    label: "DND5E.AbilitySan",
    abbreviation: "DND5E.AbilitySanAbbr",
    type: "mental",
    fullKey: "sanity",
    defaults: { npc: "wis", vehicle: 0 },
    improvement: false
  }
};
preLocalize("abilities", { keys: ["label", "abbreviation"] });

/**
 * Configure which ability score is used as the default modifier for initiative rolls,
 * when calculating hit points per level and hit dice, and as the default modifier for
 * saving throws to maintain concentration.
 * @enum {string}
 */
DND5E.defaultAbilities = {
  meleeAttack: "str",
  rangedAttack: "dex",
  initiative: "dex",
  hitPoints: "con",
  concentration: "con"
};

/* -------------------------------------------- */

/**
 * Configuration data for skills.
 *
 * @typedef {object} SkillConfiguration
 * @property {string} label        Localized label.
 * @property {string} ability      Key for the default ability used by this skill.
 * @property {string} fullKey      Fully written key used as alternate for enrichers.
 * @property {string} [reference]  Reference to a rule page describing this skill.
 * @property {object} [pace]       Configuration for skills affected by travel pace.
 * @property {Set<TravelPace5e>} [pace.advantage]     Grant advantage on this skill when traveling at the given paces.
 * @property {Set<TravelPace5e>} [pace.disadvantage]  Grant disadvantage on this skill when traveling at the given
 *                                                    paces.
 */

/**
 * The set of skill which can be trained with their default ability scores.
 * @enum {SkillConfiguration}
 */
DND5E.skills = {
  acr: {
    label: "DND5E.SkillAcr",
    ability: "dex",
    fullKey: "acrobatics",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.AvvBLEHNl7kuwPkN",
    icon: "icons/equipment/feet/shoes-simple-leaf-green.webp"
  },
  ani: {
    label: "DND5E.SkillAni",
    ability: "wis",
    fullKey: "animalHandling",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.xb3MCjUvopOU4viE",
    icon: "icons/environment/creatures/horse-brown.webp"
  },
  arc: {
    label: "DND5E.SkillArc",
    ability: "int",
    fullKey: "arcana",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.h3bYSPge8IOqne1N",
    icon: "icons/sundries/books/book-embossed-jewel-silver-green.webp"
  },
  ath: {
    label: "DND5E.SkillAth",
    ability: "str",
    fullKey: "athletics",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.rIR7ttYDUpH3tMzv",
    icon: "icons/magic/control/buff-strength-muscle-damage-orange.webp"
  },
  dec: {
    label: "DND5E.SkillDec",
    ability: "cha",
    fullKey: "deception",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.mqVZ2fz0L7a9VeKJ",
    icon: "icons/magic/control/mouth-smile-deception-purple.webp"
  },
  his: {
    label: "DND5E.SkillHis",
    ability: "int",
    fullKey: "history",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kRBZbdWMGW9K3wdY",
    icon: "icons/sundries/books/book-embossed-bound-brown.webp"
  },
  ins: {
    label: "DND5E.SkillIns",
    ability: "wis",
    fullKey: "insight",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.8R5SMbAGbECNgO8z",
    icon: "icons/magic/perception/orb-crystal-ball-scrying-blue.webp"
  },
  itm: {
    label: "DND5E.SkillItm",
    ability: "cha",
    fullKey: "intimidation",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4VHHI2gJ1jEsppfg",
    icon: "icons/skills/social/intimidation-impressing.webp"
  },
  inv: {
    label: "DND5E.SkillInv",
    ability: "int",
    fullKey: "investigation",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Y7nmbQAruWOs7WRM",
    icon: "icons/tools/scribal/magnifying-glass.webp"
  },
  med: {
    label: "DND5E.SkillMed",
    ability: "wis",
    fullKey: "medicine",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.GeYmM7BVfSCAga4o",
    icon: "icons/tools/cooking/mortar-herbs-yellow.webp"
  },
  nat: {
    label: "DND5E.SkillNat",
    ability: "int",
    fullKey: "nature",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ueMx3uF2PQlcye31",
    icon: "icons/magic/nature/plant-sprout-snow-green.webp"
  },
  prc: {
    label: "DND5E.SkillPrc",
    ability: "wis",
    fullKey: "perception",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.zjEeHCUqfuprfzhY",
    icon: "icons/magic/perception/eye-ringed-green.webp",
    pace: {
      advantage: new Set(["slow"]),
      disadvantage: new Set(["fast"])
    }
  },
  prf: {
    label: "DND5E.SkillPrf",
    ability: "cha",
    fullKey: "performance",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hYT7Z06yDNBcMtGe",
    icon: "icons/tools/instruments/lute-gold-brown.webp"
  },
  per: {
    label: "DND5E.SkillPer",
    ability: "cha",
    fullKey: "persuasion",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4R5H8iIsdFQTsj3X",
    icon: "icons/skills/social/diplomacy-handshake.webp"
  },
  rel: {
    label: "DND5E.SkillRel",
    ability: "int",
    fullKey: "religion",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.CXVzERHdP4qLhJXM",
    icon: "icons/magic/holy/saint-glass-portrait-halo.webp"
  },
  slt: {
    label: "DND5E.SkillSlt",
    ability: "dex",
    fullKey: "sleightOfHand",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.yg6SRpGNVz9nDW0A",
    icon: "icons/sundries/gaming/playing-cards.webp"
  },
  ste: {
    label: "DND5E.SkillSte",
    ability: "dex",
    fullKey: "stealth",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4MfrpERNiQXmvgCI",
    icon: "icons/magic/perception/shadow-stealth-eyes-purple.webp",
    pace: {
      disadvantage: new Set(["normal", "fast"])
    }
  },
  sur: {
    label: "DND5E.SkillSur",
    ability: "wis",
    fullKey: "survival",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.t3EzDU5b9BVAIEVi",
    icon: "icons/magic/fire/flame-burning-campfire-yellow-blue.webp",
    pace: {
      advantage: new Set(["slow"]),
      disadvantage: new Set(["fast"])
    }
  }
};
preLocalize("skills", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * Base passive score and the amount by which the passive skill scores are modified when that skill has
 * advantage or disadvantage.
 * @type {{ base: number, modifier: number }}
 */
DND5E.skillPassive = {
  base: 10,
  modifier: 5
};

/* -------------------------------------------- */

/**
 * Character alignment options.
 * @enum {string}
 */
DND5E.alignments = {
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
 * An enumeration of item attunement types.
 * @enum {string}
 */
DND5E.attunementTypes = {
  required: "DND5E.AttunementRequired",
  optional: "DND5E.AttunementOptional"
};
preLocalize("attunementTypes");

/**
 * An enumeration of item attunement states.
 * @type {{"0": string, "1": string, "2": string}}
 * @deprecated since 3.2, available until 3.4
 */
DND5E.attunements = {
  0: "DND5E.AttunementNone",
  1: "DND5E.AttunementRequired",
  2: "DND5E.AttunementAttuned"
};
preLocalize("attunements");

/* -------------------------------------------- */
/*  Weapon Details                              */
/* -------------------------------------------- */

/**
 * The set of types which a weapon item can take.
 * @enum {string}
 */
DND5E.weaponTypes = {
  simpleM: "DND5E.WeaponSimpleM",
  simpleR: "DND5E.WeaponSimpleR",
  martialM: "DND5E.WeaponMartialM",
  martialR: "DND5E.WeaponMartialR",
  natural: "DND5E.WeaponNatural",
  improv: "DND5E.WeaponImprov",
  siege: "DND5E.WeaponSiege"
};
preLocalize("weaponTypes");

/* -------------------------------------------- */

/**
 * General weapon categories.
 * @enum {string}
 */
DND5E.weaponProficiencies = {
  sim: "DND5E.WeaponSimpleProficiency",
  mar: "DND5E.WeaponMartialProficiency"
};
preLocalize("weaponProficiencies");

/* -------------------------------------------- */

/**
 * @typedef {object} WeaponMasterConfiguration
 * @property {string} label        Localized label for the mastery
 * @property {string} [reference]  Reference to a rule page describing this mastery.
 */

/**
 * Weapon masteries.
 * @enum {WeaponMasterConfiguration}
 */
DND5E.weaponMasteries = {
  cleave: {
    label: "DND5E.WEAPON.Mastery.Cleave",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ULDpodOdTxTTiNEx"
  },
  graze: {
    label: "DND5E.WEAPON.Mastery.Graze",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.PPnaXKPsQvAZp0J4"
  },
  nick: {
    label: "DND5E.WEAPON.Mastery.Nick",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.l0uao3UVco5ptQso"
  },
  push: {
    label: "DND5E.WEAPON.Mastery.Push",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.BPD7ScnLyuPwl145"
  },
  sap: {
    label: "DND5E.WEAPON.Mastery.Sap",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.fPkZQ7TkKCCA3nTc"
  },
  slow: {
    label: "DND5E.WEAPON.Mastery.Slow",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.OQQ7hAp6OAxX1rXY"
  },
  topple: {
    label: "DND5E.WEAPON.Mastery.Topple",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.IMnpuysdrSalmZJg"
  },
  vex: {
    label: "DND5E.WEAPON.Mastery.Vex",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hg3adn9O1O5Z2QxL"
  }
};
preLocalize("weaponMasteries", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * A mapping between `DND5E.weaponTypes` and `DND5E.weaponProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
DND5E.weaponProficienciesMap = {
  simpleM: "sim",
  simpleR: "sim",
  martialM: "mar",
  martialR: "mar"
};

/* -------------------------------------------- */

/**
 * A mapping between `DND5E.weaponTypes` and `DND5E.attackClassifications`. Unlisted types are assumed to be
 * of the "weapon" classification.
 * @enum {string}
 */
DND5E.weaponClassificationMap = {};

/* -------------------------------------------- */

/**
 * A mapping between `DND5E.weaponTypes` and `DND5E.attackTypes`.
 * @enum {string}
 */
DND5E.weaponTypeMap = {
  simpleM: "melee",
  simpleR: "ranged",
  martialM: "melee",
  martialR: "ranged",
  siege: "ranged"
};

/* -------------------------------------------- */

/**
 * The basic weapon types in 5e. This enables specific weapon proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
DND5E.weaponIds = {
  battleaxe: "Compendium.dnd5e.equipment24.Item.phbwepBattleaxe0",
  blowgun: "Compendium.dnd5e.equipment24.Item.phbwepBlowgun000",
  club: "Compendium.dnd5e.equipment24.Item.phbwepClub000000",
  dagger: "Compendium.dnd5e.equipment24.Item.phbwepDagger0000",
  dart: "Compendium.dnd5e.equipment24.Item.phbwepDart000000",
  flail: "Compendium.dnd5e.equipment24.Item.phbwepFlail00000",
  glaive: "Compendium.dnd5e.equipment24.Item.phbwepGlaive0000",
  greataxe: "Compendium.dnd5e.equipment24.Item.phbwepGreataxe00",
  greatclub: "Compendium.dnd5e.equipment24.Item.phbwepGreatclub0",
  greatsword: "Compendium.dnd5e.equipment24.Item.phbwepGreatsword",
  halberd: "Compendium.dnd5e.equipment24.Item.phbwepHalberd000",
  handaxe: "Compendium.dnd5e.equipment24.Item.phbwepHandaxe000",
  handcrossbow: "Compendium.dnd5e.equipment24.Item.phbwepHandCrossb",
  heavycrossbow: "Compendium.dnd5e.equipment24.Item.phbwepHeavyCross",
  javelin: "Compendium.dnd5e.equipment24.Item.phbwepJavelin000",
  lance: "Compendium.dnd5e.equipment24.Item.phbwepLance00000",
  lightcrossbow: "Compendium.dnd5e.equipment24.Item.phbwepLightCross",
  lighthammer: "Compendium.dnd5e.equipment24.Item.phbwepLightHamme",
  longbow: "Compendium.dnd5e.equipment24.Item.phbwepLongbow000",
  longsword: "Compendium.dnd5e.equipment24.Item.phbwepLongsword0",
  mace: "Compendium.dnd5e.equipment24.Item.phbwepMace000000",
  maul: "Compendium.dnd5e.equipment24.Item.phbwepMaul000000",
  morningstar: "Compendium.dnd5e.equipment24.Item.phbwepMorningsta",
  musket: "Compendium.dnd5e.equipment24.Item.phbwepMusket0000",
  pike: "Compendium.dnd5e.equipment24.Item.phbwepPike000000",
  pistol: "Compendium.dnd5e.equipment24.Item.phbwepPistol0000",
  quarterstaff: "Compendium.dnd5e.equipment24.Item.phbwepQuartersta",
  rapier: "Compendium.dnd5e.equipment24.Item.phbwepRapier0000",
  scimitar: "Compendium.dnd5e.equipment24.Item.phbwepScimitar00",
  shortsword: "Compendium.dnd5e.equipment24.Item.phbwepShortsword",
  sickle: "Compendium.dnd5e.equipment24.Item.phbwepSickle0000",
  spear: "Compendium.dnd5e.equipment24.Item.phbwepSpear00000",
  shortbow: "Compendium.dnd5e.equipment24.Item.phbwepShortbow00",
  sling: "Compendium.dnd5e.equipment24.Item.phbwepSling00000",
  trident: "Compendium.dnd5e.equipment24.Item.phbwepTrident000",
  warpick: "Compendium.dnd5e.equipment24.Item.phbwepWarPick000",
  warhammer: "Compendium.dnd5e.equipment24.Item.phbwepWarhammer0",
  whip: "Compendium.dnd5e.equipment24.Item.phbwepWhip000000"
};

/* -------------------------------------------- */

/**
 * The basic ammunition types.
 * @enum {string}
 */
DND5E.ammoIds = {
  arrow: "Compendium.dnd5e.equipment24.Item.phbamoArrows0000",
  blowgunNeedle: "Compendium.dnd5e.equipment24.Item.phbamoNeedles000",
  crossbowBolt: "Compendium.dnd5e.equipment24.Item.phbamoBolts00000",
  firearmBullet: "Compendium.dnd5e.equipment24.Item.phbamoBulletsFir",
  slingBullet: "Compendium.dnd5e.equipment24.Item.phbamoBulletsSli"
};

/* -------------------------------------------- */
/*  Bastion Facilities                          */
/* -------------------------------------------- */

/**
 * @typedef FacilityConfiguration
 * @property {Record<string, Record<number, number>>} advancement  The number of free facilities of a given type awarded
 *                                                                 at certain character levels.
 * @property {Record<string, FacilityOrder>} orders                Orders that can be issued to a facility.
 * @property {Record<string, FacilitySize>} sizes                  Facility size categories.
 * @property {Record<string, SubtypeTypeConfiguration>} types      Facility types and subtypes.
 */

/**
 * @typedef FacilityOrder
 * @property {string} label       The human-readable name of the order.
 * @property {string} icon        The SVG icon for this order.
 * @property {boolean} [basic]    Whether this order can be issued to basic facilities.
 * @property {number} [duration]  The amount of time taken to complete the order if different to a normal bastion turn.
 * @property {boolean} [hidden]   This order is not normally available for execution.
 */

/**
 * @typedef FacilitySize
 * @property {string} label    The human-readable name of the size category.
 * @property {number} days     The number of days to build the facility.
 * @property {number} squares  The maximum area the facility may occupy in the bastion plan.
 * @property {number} value    The cost in gold pieces to build the facility.
 */

/**
 * Configuration data for bastion facilities.
 * @type {FacilityConfiguration}
 */
DND5E.facilities = {
  advancement: {
    basic: { 5: 2 },
    special: { 5: 2, 9: 4, 13: 5, 17: 6 }
  },
  orders: {
    build: {
      label: "DND5E.FACILITY.Orders.build.inf",
      icon: "systems/dnd5e/icons/svg/facilities/build.svg"
    },
    change: {
      label: "DND5E.FACILITY.Orders.change.inf",
      icon: "systems/dnd5e/icons/svg/facilities/change.svg",
      duration: 21
    },
    craft: {
      label: "DND5E.FACILITY.Orders.craft.inf",
      icon: "systems/dnd5e/icons/svg/facilities/craft.svg"
    },
    empower: {
      label: "DND5E.FACILITY.Orders.empower.inf",
      icon: "systems/dnd5e/icons/svg/facilities/empower.svg"
    },
    enlarge: {
      label: "DND5E.FACILITY.Orders.enlarge.inf",
      icon: "systems/dnd5e/icons/svg/facilities/enlarge.svg",
      basic: true
    },
    harvest: {
      label: "DND5E.FACILITY.Orders.harvest.inf",
      icon: "systems/dnd5e/icons/svg/facilities/harvest.svg"
    },
    maintain: {
      label: "DND5E.FACILITY.Orders.maintain.inf",
      icon: "systems/dnd5e/icons/svg/facilities/maintain.svg"
    },
    recruit: {
      label: "DND5E.FACILITY.Orders.recruit.inf",
      icon: "systems/dnd5e/icons/svg/facilities/recruit.svg"
    },
    repair: {
      label: "DND5E.FACILITY.Orders.repair.inf",
      icon: "systems/dnd5e/icons/svg/facilities/repair.svg",
      hidden: true
    },
    research: {
      label: "DND5E.FACILITY.Orders.research.inf",
      icon: "systems/dnd5e/icons/svg/facilities/research.svg"
    },
    trade: {
      label: "DND5E.FACILITY.Orders.trade.inf",
      icon: "systems/dnd5e/icons/svg/facilities/trade.svg"
    }
  },
  sizes: {
    cramped: {
      label: "DND5E.FACILITY.Sizes.cramped",
      days: 20,
      squares: 4,
      value: 500
    },
    roomy: {
      label: "DND5E.FACILITY.Sizes.roomy",
      days: 45,
      squares: 16,
      value: 1_000
    },
    vast: {
      label: "DND5E.FACILITY.Sizes.vast",
      days: 125,
      squares: 36,
      value: 3_000
    }
  },
  types: {
    basic: {
      label: "DND5E.FACILITY.Types.Basic.Label.one",
      subtypes: {
        bedroom: "DND5E.FACILITY.Types.Basic.Bedroom",
        diningRoom: "DND5E.FACILITY.Types.Basic.DiningRoom",
        parlor: "DND5E.FACILITY.Types.Basic.Parlor",
        courtyard: "DND5E.FACILITY.Types.Basic.Courtyard",
        kitchen: "DND5E.FACILITY.Types.Basic.Kitchen",
        storage: "DND5E.FACILITY.Types.Basic.Storage"
      }
    },
    special: {
      label: "DND5E.FACILITY.Types.Special.Label.one",
      subtypes: {
        arcaneStudy: "DND5E.FACILITY.Types.Special.ArcaneStudy",
        armory: "DND5E.FACILITY.Types.Special.Armory",
        barrack: "DND5E.FACILITY.Types.Special.Barrack",
        garden: "DND5E.FACILITY.Types.Special.Garden",
        library: "DND5E.FACILITY.Types.Special.Library",
        sanctuary: "DND5E.FACILITY.Types.Special.Sanctuary",
        smithy: "DND5E.FACILITY.Types.Special.Smithy",
        storehouse: "DND5E.FACILITY.Types.Special.Storehouse",
        workshop: "DND5E.FACILITY.Types.Special.Workshop",
        gamingHall: "DND5E.FACILITY.Types.Special.GamingHall",
        greenhouse: "DND5E.FACILITY.Types.Special.Greenhouse",
        laboratory: "DND5E.FACILITY.Types.Special.Laboratory",
        sacristy: "DND5E.FACILITY.Types.Special.Sacristy",
        scriptorium: "DND5E.FACILITY.Types.Special.Scriptorium",
        stable: "DND5E.FACILITY.Types.Special.Stable",
        teleportationCircle: "DND5E.FACILITY.Types.Special.TeleportationCircle",
        theater: "DND5E.FACILITY.Types.Special.Theater",
        trainingArea: "DND5E.FACILITY.Types.Special.TrainingArea",
        trophyRoom: "DND5E.FACILITY.Types.Special.TrophyRoom",
        archive: "DND5E.FACILITY.Types.Special.Archive",
        meditationChamber: "DND5E.FACILITY.Types.Special.MeditationChamber",
        menagerie: "DND5E.FACILITY.Types.Special.Menagerie",
        observatory: "DND5E.FACILITY.Types.Special.Observatory",
        pub: "DND5E.FACILITY.Types.Special.Pub",
        reliquary: "DND5E.FACILITY.Types.Special.Reliquary",
        demiplane: "DND5E.FACILITY.Types.Special.Demiplane",
        guildhall: "DND5E.FACILITY.Types.Special.Guildhall",
        sanctum: "DND5E.FACILITY.Types.Special.Sanctum",
        warRoom: "DND5E.FACILITY.Types.Special.WarRoom"
      }
    }
  }
};
preLocalize("facilities.orders", { key: "label", sort: true });
preLocalize("facilities.sizes", { key: "label", sort: true });
preLocalize("facilities.types", { key: "label", sort: true });
preLocalize("facilities.types.basic.subtypes", { sort: true });
preLocalize("facilities.types.special.subtypes", { sort: true });

/* -------------------------------------------- */
/*  Tool Details                                */
/* -------------------------------------------- */

/**
 * The categories into which Tool items can be grouped.
 *
 * @enum {string}
 */
DND5E.toolTypes = {
  art: "DND5E.ToolArtisans",
  game: "DND5E.ToolGamingSet",
  music: "DND5E.ToolMusicalInstrument"
};
preLocalize("toolTypes", { sort: true });

/**
 * The categories of tool proficiencies that a character can gain.
 *
 * @enum {string}
 */
DND5E.toolProficiencies = {
  ...DND5E.toolTypes,
  vehicle: "DND5E.ToolVehicle"
};
preLocalize("toolProficiencies", { sort: true });

/**
 * @typedef ToolConfiguration
 * @property {string} ability  Default ability used for the tool.
 * @property {string} id       UUID of reference tool or ID within pack defined by `DND5E.sourcePacks.ITEMS`.
 */

/**
 * Configuration data for tools.
 * @enum {ToolConfiguration}
 */
DND5E.tools = {
  alchemist: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulAlchemists"
  },
  bagpipes: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusBagpipes00"
  },
  brewer: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulBrewersSup"
  },
  calligrapher: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulCalligraph"
  },
  card: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbgstPlayingcar"
  },
  carpenter: {
    ability: "str",
    id: "Compendium.dnd5e.equipment24.Item.phbtulCarpenters"
  },
  cartographer: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbtulCartograph"
  },
  chess: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbgstDragonches"
  },
  cobbler: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulCobblersTo"
  },
  cook: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbtulCooksUtens"
  },
  dice: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbgstDice000000"
  },
  disg: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbtulDisguiseKi"
  },
  drum: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusDrum000000"
  },
  dulcimer: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusDulcimer00"
  },
  flute: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusFlute00000"
  },
  forg: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulForgeryKit"
  },
  glassblower: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulGlassblowe"
  },
  herb: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulHerbalismK"
  },
  horn: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusHorn000000"
  },
  jeweler: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulJewelersTo"
  },
  leatherworker: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulLeatherwor"
  },
  lute: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusLute000000"
  },
  lyre: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusLyre000000"
  },
  mason: {
    ability: "str",
    id: "Compendium.dnd5e.equipment24.Item.phbtulMasonsTool"
  },
  navg: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbtulNavigators"
  },
  painter: {
    ability: "wis",
    id: "Compendium.dnd5e.equipment24.Item.phbtulPaintersSu"
  },
  panflute: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusPanflute00"
  },
  pois: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulPoisonersK"
  },
  potter: {
    ability: "int",
    id: "Compendium.dnd5e.equipment24.Item.phbtulPottersToo"
  },
  shawm: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusShawm00000"
  },
  smith: {
    ability: "str",
    id: "Compendium.dnd5e.equipment24.Item.phbtulSmithsTool"
  },
  thief: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulThievesToo"
  },
  tinker: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulTinkersToo"
  },
  viol: {
    ability: "cha",
    id: "Compendium.dnd5e.equipment24.Item.phbmusViol000000"
  },
  weaver: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulWeaversToo"
  },
  woodcarver: {
    ability: "dex",
    id: "Compendium.dnd5e.equipment24.Item.phbtulWoodcarver"
  }
};

/**
 * The basic tool types in 5e. This enables specific tool proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
DND5E.toolIds = new Proxy(DND5E.tools, {
  get(target, prop) {
    return target[prop]?.id ?? target[prop];
  }
});

/* -------------------------------------------- */
/*  Time                                        */
/* -------------------------------------------- */

/**
 * @typedef {object} TimeUnitConfiguration
 * @property {string} label            Localized label for this unit.
 * @property {string} [counted]        Localization path for counted plural forms. Only necessary if non-supported unit
 *                                     or using non-standard name for a supported unit. List of supported units can be
 *                                     found here: https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers
 * @property {number} conversion       Conversion multiplier used to converting between units.
 * @property {boolean} [combat=false]  Is this a combat-specific time unit?
 * @property {boolean} [option=true]   Should this be available when users can select from a list of units?
 */

/**
 * Configuration for time units available to the system.
 * @enum {TimeUnitConfiguration}
 */
DND5E.timeUnits = {
  turn: {
    label: "DND5E.UNITS.TIME.Turn.Label",
    counted: "DND5E.UNITS.TIME.Turn.Counted",
    conversion: .1,
    combat: true
  },
  round: {
    label: "DND5E.UNITS.TIME.Round.Label",
    counted: "DND5E.UNITS.TIME.Round.Counted",
    conversion: .1,
    combat: true
  },
  second: {
    label: "DND5E.UNITS.TIME.Second.Label",
    conversion: 1 / 60,
    option: false
  },
  minute: {
    label: "DND5E.UNITS.TIME.Minute.Label",
    conversion: 1
  },
  hour: {
    label: "DND5E.UNITS.TIME.Hour.Label",
    conversion: 60
  },
  day: {
    label: "DND5E.UNITS.TIME.Day.Label",
    conversion: 1_440
  },
  week: {
    label: "DND5E.UNITS.TIME.Week.Label",
    conversion: 10_080,
    option: false
  },
  month: {
    label: "DND5E.UNITS.TIME.Month.Label",
    conversion: 43_200
  },
  year: {
    label: "DND5E.UNITS.TIME.Year.Label",
    conversion: 525_600
  }
};
preLocalize("timeUnits", { key: "label" });

/* -------------------------------------------- */

/**
 * Time periods that accept a numeric value.
 * @enum {string}
 */
DND5E.scalarTimePeriods = new Proxy(DND5E.timeUnits, {
  get(target, prop) {
    return target[prop]?.label;
  },
  has(target, key) {
    return target[key] && target[key].option !== false;
  },
  ownKeys(target) {
    return Object.keys(target).filter(k => target[k]?.option !== false);
  }
});

/* -------------------------------------------- */

/**
 * Time periods for spells that don't have a defined ending.
 * @enum {string}
 */
DND5E.permanentTimePeriods = {
  disp: "DND5E.TimeDisp",
  dstr: "DND5E.TimeDispTrig",
  perm: "DND5E.TimePerm"
};
preLocalize("permanentTimePeriods");

/* -------------------------------------------- */

/**
 * Time periods that don't accept a numeric value.
 * @enum {string}
 */
DND5E.specialTimePeriods = {
  inst: "DND5E.TimeInst",
  spec: "DND5E.Special"
};
preLocalize("specialTimePeriods");

/* -------------------------------------------- */

/**
 * The various lengths of time over which effects can occur.
 * @enum {string}
 */
DND5E.timePeriods = {
  ...DND5E.specialTimePeriods,
  ...DND5E.permanentTimePeriods,
  ...DND5E.scalarTimePeriods
};
preLocalize("timePeriods");

/* -------------------------------------------- */

/**
 * Ways in which to activate an item that cannot be labeled with a cost.
 * @enum {string}
 */
DND5E.staticAbilityActivationTypes = {
  none: "DND5E.NoneActionLabel",
  special: DND5E.timePeriods.spec
};

/**
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
DND5E.abilityActivationTypes = {
  ...DND5E.staticAbilityActivationTypes,
  action: "DND5E.Action",
  bonus: "DND5E.BonusAction",
  reaction: "DND5E.Reaction",
  minute: DND5E.timePeriods.minute,
  hour: DND5E.timePeriods.hour,
  day: DND5E.timePeriods.day,
  legendary: "DND5E.LegendaryAction.Label",
  mythic: "DND5E.MythicActionLabel",
  lair: "DND5E.LAIR.Action.Label",
  crew: "DND5E.VehicleCrewAction"
};
preLocalize("abilityActivationTypes");

/* -------------------------------------------- */

/**
 * @typedef ActivityActivationTypeConfig
 * @property {string} label             Localized label for the activation type.
 * @property {string} [header]          Localized label for the activation type header.
 * @property {string} [group]           Localized label for the presentational group.
 * @property {boolean} [passive=false]  Classify this item as a passive feature on NPC sheets.
 * @property {boolean} [scalar=false]   Does this activation type have a numeric value attached?
 */

/**
 * Configuration data for activation types on activities.
 * @enum {ActivityActivationTypeConfig}
 */
DND5E.activityActivationTypes = {
  action: {
    label: "DND5E.ACTIVATION.Type.Action.Label",
    header: "DND5E.ACTIVATION.Type.Action.Header",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  bonus: {
    label: "DND5E.ACTIVATION.Type.BonusAction.Label",
    header: "DND5E.ACTIVATION.Type.BonusAction.Header",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  reaction: {
    label: "DND5E.ACTIVATION.Type.Reaction.Label",
    header: "DND5E.ACTIVATION.Type.Reaction.Header",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  minute: {
    label: "DND5E.ACTIVATION.Type.Minute.Label",
    header: "DND5E.ACTIVATION.Type.Minute.Header",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true
  },
  hour: {
    label: "DND5E.ACTIVATION.Type.Hour.Label",
    header: "DND5E.ACTIVATION.Type.Hour.Header",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true
  },
  day: {
    label: "DND5E.ACTIVATION.Type.Day.Label",
    header: "DND5E.ACTIVATION.Type.Day.Header",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true
  },
  longRest: {
    label: "DND5E.ACTIVATION.Type.LongRest.Label",
    group: "DND5E.ACTIVATION.Category.Rest",
    passive: true
  },
  shortRest: {
    label: "DND5E.ACTIVATION.Type.ShortRest.Label",
    group: "DND5E.ACTIVATION.Category.Rest",
    passive: true
  },
  encounter: {
    label: "DND5E.ACTIVATION.Type.Encounter.Label",
    group: "DND5E.ACTIVATION.Category.Combat",
    passive: true
  },
  turnStart: {
    label: "DND5E.ACTIVATION.Type.TurnStart.Label",
    group: "DND5E.ACTIVATION.Category.Combat",
    passive: true
  },
  turnEnd: {
    label: "DND5E.ACTIVATION.Type.TurnEnd.Label",
    group: "DND5E.ACTIVATION.Category.Combat",
    passive: true
  },
  legendary: {
    label: "DND5E.ACTIVATION.Type.Legendary.Label",
    header: "DND5E.ACTIVATION.Type.Legendary.Header",
    group: "DND5E.ACTIVATION.Category.Monster",
    scalar: true
  },
  mythic: {
    label: "DND5E.ACTIVATION.Type.Mythic.Label",
    header: "DND5E.ACTIVATION.Type.Mythic.Header",
    group: "DND5E.ACTIVATION.Category.Monster",
    scalar: true
  },
  lair: {
    label: "DND5E.ACTIVATION.Type.Lair.Label",
    header: "DND5E.ACTIVATION.Type.Lair.Header",
    group: "DND5E.ACTIVATION.Category.Monster"
  },
  crew: {
    label: "DND5E.ACTIVATION.Type.Crew.Label",
    header: "DND5E.ACTIVATION.Type.Crew.Header",
    group: "DND5E.ACTIVATION.Category.Vehicle",
    scalar: true
  },
  special: {
    label: "DND5E.Special",
    passive: true
  }
};
preLocalize("activityActivationTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * Different things that an ability can consume upon use.
 * @enum {string}
 */
DND5E.abilityConsumptionTypes = {
  ammo: "DND5E.ConsumeAmmunition",
  attribute: "DND5E.ConsumeAttribute",
  hitDice: "DND5E.ConsumeHitDice",
  material: "DND5E.ConsumeMaterial",
  charges: "DND5E.ConsumeCharges"
};
preLocalize("abilityConsumptionTypes", { sort: true });

/* -------------------------------------------- */

/**
 * @typedef {object} ActivityConsumptionTargetConfig
 * @property {string} label                                     Localized label for the target type.
 * @property {ConsumptionConsumeFunction} consume               Function used to consume according to this type.
 * @property {ConsumptionLabelsFunction} consumptionLabels      Function used to generate a hint of consumption amount.
 * @property {{value: string, label: string}[]} [scalingModes]  Additional scaling modes for this consumption type in
 *                                                              addition to the default "amount" scaling.
 * @property {boolean} [targetRequiresEmbedded]                 Use text input rather than select when not embedded.
 * @property {ConsumptionValidTargetsFunction} [validTargets]   Function for creating an array of consumption targets.
 */

/**
 * @callback ConsumptionConsumeFunction
 * @this {ConsumptionTargetData}
 * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
 * @param {ActivityUsageUpdates} updates     Updates to be performed.
 * @throws ConsumptionError
 */

/**
 * @callback ConsumptionLabelsFunction
 * @this {ConsumptionTargetData}
 * @param {ActivityUseConfiguration} config  Configuration data for the activity usage.
 * @param {object} [options={}]
 * @param {boolean} [options.consumed]       Is this consumption currently set to be consumed?
 * @returns {ConsumptionLabels}
 */

/**
 * @typedef ConsumptionLabels
 * @property {string} label      Label displayed for the consumption checkbox.
 * @property {string} hint       Hint text describing what should be consumed.
 * @property {{ type: string, message: string }} [notes]  Additional notes relating to the consumption to be performed.
 * @property {boolean} [warn]    Display a warning icon indicating consumption will fail.
 */

/**
 * @callback ConsumptionValidTargetsFunction
 * @this {ConsumptionTargetData}
 * @returns {FormSelectOption[]}
 */

/**
 * Configuration information for different consumption targets.
 * @enum {ActivityConsumptionTargetConfig}
 */
DND5E.activityConsumptionTypes = {
  activityUses: {
    label: "DND5E.CONSUMPTION.Type.ActivityUses.Label",
    consume: ConsumptionTargetData.consumeActivityUses,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsActivityUses
  },
  itemUses: {
    label: "DND5E.CONSUMPTION.Type.ItemUses.Label",
    consume: ConsumptionTargetData.consumeItemUses,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsItemUses,
    targetRequiresEmbedded: true,
    validTargets: ConsumptionTargetData.validItemUsesTargets
  },
  material: {
    label: "DND5E.CONSUMPTION.Type.Material.Label",
    consume: ConsumptionTargetData.consumeMaterial,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsMaterial,
    targetRequiresEmbedded: true,
    validTargets: ConsumptionTargetData.validMaterialTargets
  },
  hitDice: {
    label: "DND5E.CONSUMPTION.Type.HitDice.Label",
    consume: ConsumptionTargetData.consumeHitDice,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsHitDice,
    validTargets: ConsumptionTargetData.validHitDiceTargets
  },
  spellSlots: {
    label: "DND5E.CONSUMPTION.Type.SpellSlots.Label",
    consume: ConsumptionTargetData.consumeSpellSlots,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsSpellSlots,
    scalingModes: [{ value: "level", label: "DND5E.CONSUMPTION.Scaling.SlotLevel" }],
    validTargets: ConsumptionTargetData.validSpellSlotsTargets
  },
  attribute: {
    label: "DND5E.CONSUMPTION.Type.Attribute.Label",
    consume: ConsumptionTargetData.consumeAttribute,
    consumptionLabels: ConsumptionTargetData.consumptionLabelsAttribute,
    targetRequiresEmbedded: true,
    validTargets: ConsumptionTargetData.validAttributeTargets
  }
};
preLocalize("activityConsumptionTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * Configuration data for actor sizes.
 *
 * @typedef {object} ActorSizeConfiguration
 * @property {string} label                   Localized label.
 * @property {string} abbreviation            Localized abbreviation.
 * @property {number} hitDie                  Default hit die denomination for NPCs of this size.
 * @property {number} [token=1]               Default token size.
 * @property {number} [capacityMultiplier=1]  Multiplier used to calculate carrying capacities.
 * @property {number} numerical               Numerical representation of size.
 */

/**
 * Creature sizes ordered from smallest to largest.
 * @enum {ActorSizeConfiguration}
 */
DND5E.actorSizes = {
  tiny: {
    label: "DND5E.SizeTiny",
    abbreviation: "DND5E.SizeTinyAbbr",
    hitDie: 4,
    token: 0.5,
    capacityMultiplier: 0.5,
    numerical: 0
  },
  sm: {
    label: "DND5E.SizeSmall",
    abbreviation: "DND5E.SizeSmallAbbr",
    hitDie: 6,
    dynamicTokenScale: 0.8,
    numerical: 1
  },
  med: {
    label: "DND5E.SizeMedium",
    abbreviation: "DND5E.SizeMediumAbbr",
    hitDie: 8,
    numerical: 2
  },
  lg: {
    label: "DND5E.SizeLarge",
    abbreviation: "DND5E.SizeLargeAbbr",
    hitDie: 10,
    token: 2,
    capacityMultiplier: 2,
    numerical: 3
  },
  huge: {
    label: "DND5E.SizeHuge",
    abbreviation: "DND5E.SizeHugeAbbr",
    hitDie: 12,
    token: 3,
    capacityMultiplier: 4,
    numerical: 4
  },
  grg: {
    label: "DND5E.SizeGargantuan",
    abbreviation: "DND5E.SizeGargantuanAbbr",
    hitDie: 20,
    token: 4,
    capacityMultiplier: 8,
    numerical: 5
  }
};
preLocalize("actorSizes", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */
/*  Canvas                                      */
/* -------------------------------------------- */

/**
 * Colors used to visualize temporary and temporary maximum HP in token health bars.
 * @enum {number}
 */
DND5E.tokenHPColors = {
  damage: 0xFF0000,
  healing: 0x00FF00,
  temp: 0x66CCFF,
  tempmax: 0x440066,
  negmax: 0x550000
};

/* -------------------------------------------- */

/**
 * Colors used when a dynamic token ring effects.
 * @enum {number}
 */
DND5E.tokenRingColors = {
  damage: 0xFF0000,
  defeated: 0x000000,
  healing: 0x00FF00,
  temp: 0x33AAFF
};

/* -------------------------------------------- */

/**
 * Colors used to denote movement speed on ruler segments & grid highlighting
 * @enum {number}
 */
DND5E.tokenRulerColors = {
  normal: 0x33BC4E,
  double: 0xF1D836,
  triple: 0xE72124
};

/* -------------------------------------------- */

/**
 * Configuration data for a map marker style. Options not included will fall back to the value set in `default` style.
 * Any additional styling options added will be passed into the custom marker class and be available for rendering.
 *
 * @typedef {object} MapLocationMarkerStyle
 * @property {typeof PIXI.Container} [icon]  Map marker class used to render the icon.
 * @property {number} [backgroundColor]      Color of the background inside the circle.
 * @property {number} [borderColor]          Color of the border in normal state.
 * @property {number} [borderHoverColor]     Color of the border when hovering over the marker.
 * @property {string} [fontFamily]           Font used for rendering the code on the marker.
 * @property {number} [shadowColor]          Color of the shadow under the marker.
 * @property {number} [textColor]            Color of the text on the marker.
 */

/**
 * Settings used to render map location markers on the canvas.
 * @enum {MapLocationMarkerStyle}
 */
DND5E.mapLocationMarker = {
  default: {
    icon: MapLocationControlIcon,
    backgroundColor: 0xFBF8F5,
    borderColor: 0x000000,
    borderHoverColor: 0xFF5500,
    fontFamily: "Roboto Slab",
    shadowColor: 0x000000,
    textColor: 0x000000
  }
};

/* -------------------------------------------- */

/**
 * Configuration data for creature types.
 *
 * @typedef {object} CreatureTypeConfiguration
 * @property {string} label               Localized label.
 * @property {string} plural              Localized plural form used in swarm name.
 * @property {string} [reference]         Reference to a rule page describing this type.
 * @property {boolean} [detectAlignment]  Is this type detectable by spells such as "Detect Evil and Good"?
 */

/**
 * Default types of creatures.
 * @enum {CreatureTypeConfiguration}
 */
DND5E.creatureTypes = {
  aberration: {
    label: "DND5E.CreatureAberration",
    plural: "DND5E.CreatureAberrationPl",
    icon: "icons/creatures/tentacles/tentacle-eyes-yellow-pink.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.yy50qVC1JhPHt4LC",
    detectAlignment: true
  },
  beast: {
    label: "DND5E.CreatureBeast",
    plural: "DND5E.CreatureBeastPl",
    icon: "icons/creatures/claws/claw-bear-paw-swipe-red.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6bTHn7pZek9YX2tv"
  },
  celestial: {
    label: "DND5E.CreatureCelestial",
    plural: "DND5E.CreatureCelestialPl",
    icon: "icons/creatures/abilities/wings-birdlike-blue.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.T5CJwxjhBbi6oqaM",
    detectAlignment: true
  },
  construct: {
    label: "DND5E.CreatureConstruct",
    plural: "DND5E.CreatureConstructPl",
    icon: "icons/creatures/magical/construct-stone-earth-gray.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jQGAJZBZTqDFod8d"
  },
  dragon: {
    label: "DND5E.CreatureDragon",
    plural: "DND5E.CreatureDragonPl",
    icon: "icons/creatures/abilities/dragon-fire-breath-orange.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.k2IRXZwGk9W0PM2S"
  },
  elemental: {
    label: "DND5E.CreatureElemental",
    plural: "DND5E.CreatureElementalPl",
    icon: "icons/creatures/magical/spirit-fire-orange.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.7z1LXGGkXpHuzkFh",
    detectAlignment: true
  },
  fey: {
    label: "DND5E.CreatureFey",
    plural: "DND5E.CreatureFeyPl",
    icon: "icons/creatures/magical/fae-fairy-winged-glowing-green.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.OFsRUt3pWljgm8VC",
    detectAlignment: true
  },
  fiend: {
    label: "DND5E.CreatureFiend",
    plural: "DND5E.CreatureFiendPl",
    icon: "icons/magic/death/skull-horned-goat-pentagram-red.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ElHKBJeiJPC7gj6k",
    detectAlignment: true
  },
  giant: {
    label: "DND5E.CreatureGiant",
    plural: "DND5E.CreatureGiantPl",
    icon: "icons/creatures/magical/humanoid-giant-forest-blue.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AOXn3Mv5vPZwo0Uf"
  },
  humanoid: {
    label: "DND5E.CreatureHumanoid",
    plural: "DND5E.CreatureHumanoidPl",
    icon: "icons/environment/people/group.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iFzQs4AenN8ALRvw"
  },
  monstrosity: {
    label: "DND5E.CreatureMonstrosity",
    plural: "DND5E.CreatureMonstrosityPl",
    icon: "icons/creatures/abilities/mouth-teeth-rows-red.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.TX0yPEFTn79AMZ8P"
  },
  ooze: {
    label: "DND5E.CreatureOoze",
    plural: "DND5E.CreatureOozePl",
    icon: "icons/creatures/slimes/slime-movement-pseudopods-green.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.cgzIC1ecG03D97Fg"
  },
  plant: {
    label: "DND5E.CreaturePlant",
    plural: "DND5E.CreaturePlantPl",
    icon: "icons/magic/nature/tree-animated-strike.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.1oT7t6tHE4kZuSN1"
  },
  undead: {
    label: "DND5E.CreatureUndead",
    plural: "DND5E.CreatureUndeadPl",
    icon: "icons/magic/death/skull-horned-worn-fire-blue.webp",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.D2BdqS1GeD5rcZ6q",
    detectAlignment: true
  }
};
preLocalize("creatureTypes", { keys: ["label", "plural"], sort: true });

/* -------------------------------------------- */

/**
 * Classification types for item action types.
 * @enum {string}
 */
DND5E.itemActionTypes = {
  mwak: "DND5E.ActionMWAK",
  rwak: "DND5E.ActionRWAK",
  msak: "DND5E.ActionMSAK",
  rsak: "DND5E.ActionRSAK",
  abil: "DND5E.ActionAbil",
  save: "DND5E.ActionSave",
  ench: "DND5E.ActionEnch",
  summ: "DND5E.ActionSumm",
  heal: "DND5E.ActionHeal",
  util: "DND5E.ActionUtil",
  other: "DND5E.ActionOther"
};
preLocalize("itemActionTypes");

/* -------------------------------------------- */

/**
 * Different ways in which item capacity can be limited.
 * @enum {string}
 */
DND5E.itemCapacityTypes = {
  items: "DND5E.ItemContainerCapacityItems",
  weight: "DND5E.ItemContainerCapacityWeight"
};
preLocalize("itemCapacityTypes", { sort: true });

/* -------------------------------------------- */

/**
 * List of various item rarities.
 * @enum {string}
 */
DND5E.itemRarity = {
  common: "DND5E.ItemRarityCommon",
  uncommon: "DND5E.ItemRarityUncommon",
  rare: "DND5E.ItemRarityRare",
  veryRare: "DND5E.ItemRarityVeryRare",
  legendary: "DND5E.ItemRarityLegendary",
  artifact: "DND5E.ItemRarityArtifact"
};
preLocalize("itemRarity");

/* -------------------------------------------- */

/**
 * Configuration data for limited use periods.
 *
 * @typedef {object} LimitedUsePeriodConfiguration
 * @property {string} label                Localized label.
 * @property {string}  abbreviation        Shorthand form of the label.
 * @property {"combat"|"special"} [group]  Grouping if outside the normal "time" group.
 * @property {boolean} [formula]           Whether this limited use period restores charges via formula.
 */

/**
 * Enumerate the lengths of time over which an item can have limited use ability.
 * @enum {LimitedUsePeriodConfiguration}
 */
DND5E.limitedUsePeriods = {
  lr: {
    label: "DND5E.USES.Recovery.Period.LongRest.Label",
    abbreviation: "DND5E.USES.Recovery.Period.LongRest.Abbreviation"
  },
  sr: {
    label: "DND5E.USES.Recovery.Period.ShortRest.Label",
    abbreviation: "DND5E.USES.Recovery.Period.ShortRest.Abbreviation"
  },
  day: {
    label: "DND5E.USES.Recovery.Period.Day.Label",
    abbreviation: "DND5E.USES.Recovery.Period.Day.Label"
  },
  dawn: {
    label: "DND5E.USES.Recovery.Period.Dawn.Label",
    abbreviation: "DND5E.USES.Recovery.Period.Dawn.Label",
    formula: true
  },
  dusk: {
    label: "DND5E.USES.Recovery.Period.Dusk.Label",
    abbreviation: "DND5E.USES.Recovery.Period.Dusk.Label",
    formula: true
  },
  initiative: {
    label: "DND5E.USES.Recovery.Period.Initiative.Label",
    abbreviation: "DND5E.USES.Recovery.Period.Initiative.Label",
    type: "special"
  },
  turnStart: {
    label: "DND5E.USES.Recovery.Period.TurnStart.Label",
    abbreviation: "DND5E.USES.Recovery.Period.TurnStart.Abbreviation",
    type: "combat"
  },
  turnEnd: {
    label: "DND5E.USES.Recovery.Period.TurnEnd.Label",
    abbreviation: "DND5E.USES.Recovery.Period.TurnEnd.Abbreviation",
    type: "combat"
  },
  turn: {
    label: "DND5E.USES.Recovery.Period.Turn.Label",
    abbreviation: "DND5E.USES.Recovery.Period.Turn.Label",
    type: "combat"
  }
};
preLocalize("limitedUsePeriods", { keys: ["label", "abbreviation"] });

Object.defineProperty(DND5E.limitedUsePeriods, "recoveryOptions", {
  get() {
    return [
      ...Object.entries(CONFIG.DND5E.limitedUsePeriods)
        .filter(([, config]) => !config.deprecated)
        .map(([value, { label, type }]) => ({
          value, label, group: game.i18n.localize(`DND5E.USES.Recovery.${type?.capitalize() ?? "Time"}`)
        })),
      { value: "recharge", label: game.i18n.localize("DND5E.USES.Recovery.Recharge.Label") }
    ];
  }
});

/* -------------------------------------------- */

/**
 * Periods at which enchantments can be re-bound to new items.
 * @enum {{ label: string }}
 */
DND5E.enchantmentPeriods = {
  sr: {
    label: "DND5E.ENCHANTMENT.Period.ShortRest"
  },
  lr: {
    label: "DND5E.ENCHANTMENT.Period.LongRest"
  },
  atwill: {
    label: "DND5E.ENCHANTMENT.Period.AtWill"
  }
};
preLocalize("enchantmentPeriods", { key: "label" });

/* -------------------------------------------- */

/**
 * Specific equipment types that modify base AC.
 * @enum {string}
 */
DND5E.armorTypes = {
  light: "DND5E.EquipmentLight",
  medium: "DND5E.EquipmentMedium",
  heavy: "DND5E.EquipmentHeavy",
  natural: "DND5E.EquipmentNatural",
  shield: "DND5E.EquipmentShield"
};
preLocalize("armorTypes");

/* -------------------------------------------- */

/**
 * Equipment types that aren't armor.
 * @enum {string}
 */
DND5E.miscEquipmentTypes = {
  clothing: "DND5E.EQUIPMENT.Type.Clothing.Label",
  ring: "DND5E.EQUIPMENT.Type.Ring.Label",
  rod: "DND5E.EQUIPMENT.Type.Rod.Label",
  trinket: "DND5E.EQUIPMENT.Type.Trinket.Label",
  vehicle: "DND5E.EQUIPMENT.Type.Vehicle.Label",
  wand: "DND5E.EQUIPMENT.Type.Wand.Label",
  wondrous: "DND5E.EQUIPMENT.Type.Wondrous.Label"
};
preLocalize("miscEquipmentTypes", { sort: true });

/* -------------------------------------------- */

/**
 * The set of equipment types for armor, clothing, and other objects which can be worn by the character.
 * @enum {string}
 */
DND5E.equipmentTypes = {
  ...DND5E.miscEquipmentTypes,
  ...DND5E.armorTypes
};
preLocalize("equipmentTypes", { sort: true });

/* -------------------------------------------- */

/**
 * The various types of vehicles in which characters can be proficient.
 * @enum {string}
 */
DND5E.vehicleTypes = {
  air: "DND5E.VehicleTypeAir",
  land: "DND5E.VehicleTypeLand",
  space: "DND5E.VehicleTypeSpace",
  water: "DND5E.VehicleTypeWater"
};
preLocalize("vehicleTypes", { sort: true });

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have.
 * @type {object}
 */
DND5E.armorProficiencies = {
  lgt: "DND5E.ArmorLightProficiency",
  med: "DND5E.ArmorMediumProficiency",
  hvy: "DND5E.ArmorHeavyProficiency",
  shl: "DND5E.EquipmentShieldProficiency"
};
preLocalize("armorProficiencies");

/**
 * A mapping between `DND5E.equipmentTypes` and `DND5E.armorProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
DND5E.armorProficienciesMap = {
  natural: true,
  clothing: true,
  light: "lgt",
  medium: "med",
  heavy: "hvy",
  shield: "shl"
};

/**
 * The basic armor types in 5e. This enables specific armor proficiencies,
 * automated AC calculation in NPCs, and starting equipment.
 * @enum {string}
 */
DND5E.armorIds = {
  breastplate: "Compendium.dnd5e.equipment24.Item.phbarmBreastplat",
  chainmail: "Compendium.dnd5e.equipment24.Item.phbarmChainMail0",
  chainshirt: "Compendium.dnd5e.equipment24.Item.phbarmChainShirt",
  halfplate: "Compendium.dnd5e.equipment24.Item.phbarmHalfPlateA",
  hide: "Compendium.dnd5e.equipment24.Item.phbarmHideArmor0",
  leather: "Compendium.dnd5e.equipment24.Item.phbarmLeatherArm",
  padded: "Compendium.dnd5e.equipment24.Item.phbarmPaddedArmo",
  plate: "Compendium.dnd5e.equipment24.Item.phbarmPlateArmor",
  ringmail: "Compendium.dnd5e.equipment24.Item.phbarmRingMail00",
  scalemail: "Compendium.dnd5e.equipment24.Item.phbarmScaleMail0",
  splint: "Compendium.dnd5e.equipment24.Item.phbarmSplintArmo",
  studded: "Compendium.dnd5e.equipment24.Item.phbarmStuddedLea"
};

/**
 * The basic shield in 5e.
 * @enum {string}
 */
DND5E.shieldIds = {
  shield: "Compendium.dnd5e.equipment24.Item.phbarmShield0000"
};

/**
 * Common armor class calculations.
 * @enum {{ label: string, [formula]: string }}
 */
DND5E.armorClasses = {
  flat: {
    label: "DND5E.ArmorClassFlat",
    formula: "@attributes.ac.flat"
  },
  natural: {
    label: "DND5E.ArmorClassNatural",
    formula: "@attributes.ac.flat"
  },
  default: {
    label: "DND5E.ArmorClassEquipment",
    formula: "@attributes.ac.armor + @attributes.ac.dex"
  },
  mage: {
    label: "DND5E.ArmorClassMage",
    formula: "13 + @abilities.dex.mod"
  },
  draconic: {
    label: "DND5E.ArmorClassDraconic",
    formula: "13 + @abilities.dex.mod"
  },
  unarmoredMonk: {
    label: "DND5E.ArmorClassUnarmoredMonk",
    formula: "10 + @abilities.dex.mod + @abilities.wis.mod"
  },
  unarmoredBarb: {
    label: "DND5E.ArmorClassUnarmoredBarbarian",
    formula: "10 + @abilities.dex.mod + @abilities.con.mod"
  },
  unarmoredBard: {
    label: "DND5E.ArmorClassUnarmoredBard",
    formula: "10 + @abilities.dex.mod + @abilities.cha.mod"
  },
  custom: {
    label: "DND5E.ArmorClassCustom"
  }
};
preLocalize("armorClasses", { key: "label" });

/* -------------------------------------------- */

/**
 * Configuration data for an items that have sub-types.
 *
 * @typedef {object} SubtypeTypeConfiguration
 * @property {string} label                       Localized label for this type.
 * @property {Record<string, string>} [subtypes]  Enum containing localized labels for subtypes.
 */

/**
 * Enumerate the valid consumable types which are recognized by the system.
 * @enum {SubtypeTypeConfiguration}
 */
DND5E.consumableTypes = {
  ammo: {
    label: "DND5E.CONSUMABLE.Type.Ammunition.Label",
    subtypes: {
      arrow: "DND5E.CONSUMABLE.Type.Ammunition.Arrow",
      crossbowBolt: "DND5E.CONSUMABLE.Type.Ammunition.Bolt",
      energyCell: "DND5E.CONSUMABLE.Type.Ammunition.EnergyCell",
      firearmBullet: "DND5E.CONSUMABLE.Type.Ammunition.BulletFirearm",
      slingBullet: "DND5E.CONSUMABLE.Type.Ammunition.BulletSling",
      blowgunNeedle: "DND5E.CONSUMABLE.Type.Ammunition.Needle"
    }
  },
  potion: {
    label: "DND5E.CONSUMABLE.Type.Potion.Label"
  },
  poison: {
    label: "DND5E.CONSUMABLE.Type.Poison.Label",
    subtypes: {
      contact: "DND5E.CONSUMABLE.Type.Poison.Contact",
      ingested: "DND5E.CONSUMABLE.Type.Poison.Ingested",
      inhaled: "DND5E.CONSUMABLE.Type.Poison.Inhaled",
      injury: "DND5E.CONSUMABLE.Type.Poison.Injury"
    }
  },
  food: {
    label: "DND5E.CONSUMABLE.Type.Food.Label"
  },
  scroll: {
    label: "DND5E.CONSUMABLE.Type.Scroll.Label"
  },
  wand: {
    label: "DND5E.CONSUMABLE.Type.Wand.Label"
  },
  rod: {
    label: "DND5E.CONSUMABLE.Type.Rod.Label"
  },
  trinket: {
    label: "DND5E.CONSUMABLE.Type.Trinket.Label"
  }
};
preLocalize("consumableTypes", { key: "label", sort: true });
preLocalize("consumableTypes.ammo.subtypes", { sort: true });
preLocalize("consumableTypes.poison.subtypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of containers.
 * @enum {string}
 */
DND5E.containerTypes = {
  backpack: "H8YCd689ezlD26aT",
  barrel: "7Yqbqg5EtVW16wfT",
  basket: "Wv7HzD6dv1P0q78N",
  boltcase: "eJtPBiZtr2pp6ynt",
  bottle: "HZp69hhyNZUUCipF",
  bucket: "mQVYcHmMSoCUnBnM",
  case: "5mIeX824uMklU3xq",
  chest: "2YbuclKfhDL0bU4u",
  flask: "lHS63sC6bypENNlR",
  jug: "0ZBWwjFz3nIAXMLW",
  pot: "M8xM8BLK4tpUayEE",
  pitcher: "nXWdGtzi8DXDLLsL",
  pouch: "9bWTRRDym06PzSAf",
  quiver: "4MtQKPn9qMWCFjDA",
  sack: "CNdDj8dsXVpRVpXt",
  saddlebags: "TmfaFUSZJAotndn9",
  tankard: "uw6fINSmZ2j2o57A",
  vial: "meJEfX3gZgtMX4x2"
};

/* -------------------------------------------- */

/**
 * Configuration data for spellcasting foci.
 *
 * @typedef {object} SpellcastingFocusConfiguration
 * @property {string} label                    Localized label for this category.
 * @property {Object<string, string>} itemIds  Item IDs or UUIDs.
 */

/**
 * Type of spellcasting foci.
 * @enum {SpellcastingFocusConfiguration}
 */
DND5E.focusTypes = {
  arcane: {
    label: "DND5E.Focus.Arcane",
    itemIds: {
      crystal: "Compendium.dnd5e.equipment24.Item.phbafcCrystal000",
      orb: "Compendium.dnd5e.equipment24.Item.phbafcOrb0000000",
      rod: "Compendium.dnd5e.equipment24.Item.phbafcRod0000000",
      staff: "Compendium.dnd5e.equipment24.Item.phbafcStaffalsoa",
      wand: "Compendium.dnd5e.equipment24.Item.phbafcWand000000"
    }
  },
  druidic: {
    label: "DND5E.Focus.Druidic",
    itemIds: {
      mistletoe: "Compendium.dnd5e.equipment24.Item.phbdfcSprigofmis",
      woodenstaff: "Compendium.dnd5e.equipment24.Item.phbdfcWoodenstaf",
      yewwand: "Compendium.dnd5e.equipment24.Item.phbdfcYewwand000"
    }
  },
  holy: {
    label: "DND5E.Focus.Holy",
    itemIds: {
      amulet: "Compendium.dnd5e.equipment24.Item.phbhsyAmuletworn",
      emblem: "Compendium.dnd5e.equipment24.Item.phbhsyEmblemborn",
      reliquary: "Compendium.dnd5e.equipment24.Item.phbhsyReliquaryh"
    }
  }
};
preLocalize("focusTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * Types of "features" items.
 * @enum {SubtypeTypeConfiguration}
 */
DND5E.featureTypes = {
  background: {
    label: "DND5E.Feature.Background"
  },
  class: {
    label: "DND5E.Feature.Class.Label",
    subtypes: {
      arcaneShot: "DND5E.Feature.Class.ArcaneShot",
      artificerInfusion: "DND5E.Feature.Class.ArtificerInfusion",
      channelDivinity: "DND5E.Feature.Class.ChannelDivinity",
      defensiveTactic: "DND5E.Feature.Class.DefensiveTactic",
      eldritchInvocation: "DND5E.Feature.Class.EldritchInvocation",
      elementalDiscipline: "DND5E.Feature.Class.ElementalDiscipline",
      fightingStyle: "DND5E.Feature.Class.FightingStyle",
      huntersPrey: "DND5E.Feature.Class.HuntersPrey",
      ki: "DND5E.Feature.Class.Ki",
      maneuver: "DND5E.Feature.Class.Maneuver",
      metamagic: "DND5E.Feature.Class.Metamagic",
      multiattack: "DND5E.Feature.Class.Multiattack",
      pact: "DND5E.Feature.Class.PactBoon",
      psionicPower: "DND5E.Feature.Class.PsionicPower",
      rune: "DND5E.Feature.Class.Rune",
      superiorHuntersDefense: "DND5E.Feature.Class.SuperiorHuntersDefense"
    }
  },
  monster: {
    label: "DND5E.Feature.Monster"
  },
  race: {
    label: "DND5E.Feature.Species"
  },
  enchantment: {
    label: "DND5E.ENCHANTMENT.Label",
    subtypes: {
      artificerInfusion: "DND5E.Feature.Class.ArtificerInfusion",
      rune: "DND5E.Feature.Class.Rune"
    }
  },
  feat: {
    label: "DND5E.Feature.Feat.Label",
    subtypes: {
      general: "DND5E.Feature.Feat.General",
      origin: "DND5E.Feature.Feat.Origin",
      fightingStyle: "DND5E.Feature.Feat.FightingStyle",
      epicBoon: "DND5E.Feature.Feat.EpicBoon"
    }
  },
  supernaturalGift: {
    label: "DND5E.Feature.SupernaturalGift.Label",
    subtypes: {
      blessing: "DND5E.Feature.SupernaturalGift.Blessing",
      charm: "DND5E.Feature.SupernaturalGift.Charm",
      epicBoon: "DND5E.Feature.SupernaturalGift.EpicBoon"
    }
  },
  vehicle: {
    label: "DND5E.Feature.Vehicle.Label"
  }
};
preLocalize("featureTypes", { key: "label" });
preLocalize("featureTypes.class.subtypes", { sort: true });
preLocalize("featureTypes.enchantment.subtypes", { sort: true });
preLocalize("featureTypes.feat.subtypes", { sort: true });
preLocalize("featureTypes.supernaturalGift.subtypes", { sort: true });

/* -------------------------------------------- */

/**
 * Configuration data for item properties.
 *
 * @typedef {object} ItemPropertyConfiguration
 * @property {string} label           Localized label.
 * @property {string} [abbreviation]  Localized abbreviation.
 * @property {string} [icon]          Icon that can be used in certain places to represent this property.
 * @property {string} [reference]     Reference to a rule page describing this property.
 * @property {boolean} [isPhysical]   Is this property one that can cause damage resistance bypasses?
 * @property {boolean} [isTag]        Is this spell property a tag, rather than a component?
 */

/**
 * The various properties of all item types.
 * @enum {ItemPropertyConfiguration}
 */
DND5E.itemProperties = {
  ada: {
    label: "DND5E.ITEM.Property.Adamantine",
    isPhysical: true
  },
  amm: {
    label: "DND5E.ITEM.Property.Ammunition"
  },
  concentration: {
    label: "DND5E.ITEM.Property.Concentration",
    abbreviation: "DND5E.ConcentrationAbbr",
    icon: "systems/dnd5e/icons/svg/statuses/concentrating.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ow58p27ctAnr4VPH",
    isTag: true
  },
  fin: {
    label: "DND5E.ITEM.Property.Finesse"
  },
  fir: {
    label: "DND5E.ITEM.Property.Firearm"
  },
  foc: {
    label: "DND5E.ITEM.Property.Focus"
  },
  hvy: {
    label: "DND5E.ITEM.Property.Heavy"
  },
  lgt: {
    label: "DND5E.ITEM.Property.Light"
  },
  lod: {
    label: "DND5E.ITEM.Property.Loading"
  },
  material: {
    label: "DND5E.ITEM.Property.Material",
    abbreviation: "DND5E.ComponentMaterialAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AeH5eDS4YeM9RETC"
  },
  mgc: {
    label: "DND5E.ITEM.Property.Magical",
    icon: "systems/dnd5e/icons/svg/properties/magical.svg",
    isPhysical: true
  },
  rch: {
    label: "DND5E.ITEM.Property.Reach"
  },
  rel: {
    label: "DND5E.ITEM.Property.Reload"
  },
  ret: {
    label: "DND5E.ITEM.Property.Returning"
  },
  ritual: {
    label: "DND5E.ITEM.Property.Ritual",
    abbreviation: "DND5E.RitualAbbr",
    icon: "systems/dnd5e/icons/svg/items/spell.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.FjWqT5iyJ89kohdA",
    isTag: true
  },
  sidekick: {
    label: "DND5E.ITEM.Property.Sidekick"
  },
  sil: {
    label: "DND5E.ITEM.Property.Silvered",
    isPhysical: true
  },
  somatic: {
    label: "DND5E.ITEM.Property.Somatic",
    abbreviation: "DND5E.ComponentSomaticAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.qwUNgUNilEmZkSC9"
  },
  spc: {
    label: "DND5E.ITEM.Property.Special"
  },
  stealthDisadvantage: {
    label: "DND5E.ITEM.Property.StealthDisadvantage"
  },
  thr: {
    label: "DND5E.ITEM.Property.Thrown"
  },
  trait: {
    label: "DND5E.ITEM.Property.Trait"
  },
  two: {
    label: "DND5E.ITEM.Property.TwoHanded"
  },
  ver: {
    label: "DND5E.ITEM.Property.Versatile"
  },
  vocal: {
    label: "DND5E.ITEM.Property.Verbal",
    abbreviation: "DND5E.ComponentVerbalAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6UXTNWMCQ0nSlwwx"
  },
  weightlessContents: {
    label: "DND5E.ITEM.Property.WeightlessContents"
  }
};
preLocalize("itemProperties", { keys: ["label", "abbreviation"], sort: true });

/* -------------------------------------------- */

/**
 * The various properties of an item per item type.
 * @enum {object}
 */
DND5E.validProperties = {
  class: new Set([
    "sidekick"
  ]),
  consumable: new Set([
    "mgc"
  ]),
  container: new Set([
    "mgc",
    "weightlessContents"
  ]),
  equipment: new Set([
    "ada",
    "foc",
    "mgc",
    "stealthDisadvantage"
  ]),
  feat: new Set([
    "mgc",
    "trait"
  ]),
  loot: new Set([
    "mgc"
  ]),
  weapon: new Set([
    "ada",
    "amm",
    "fin",
    "fir",
    "foc",
    "hvy",
    "lgt",
    "lod",
    "mgc",
    "rch",
    "rel",
    "ret",
    "sil",
    "spc",
    "thr",
    "two",
    "ver"
  ]),
  spell: new Set([
    "vocal",
    "somatic",
    "material",
    "concentration",
    "ritual"
  ]),
  tool: new Set([
    "mgc"
  ])
};

/* -------------------------------------------- */

/**
 * Configuration data for an item with the "loot" type.
 *
 * @typedef {object} LootTypeConfiguration
 * @property {string} label                       Localized label for this type.
 */

/**
 * Types of "loot" items.
 * @enum {LootTypeConfiguration}
 */
DND5E.lootTypes = {
  art: {
    label: "DND5E.Loot.Art"
  },
  gear: {
    label: "DND5E.Loot.Gear"
  },
  gem: {
    label: "DND5E.Loot.Gem"
  },
  junk: {
    label: "DND5E.Loot.Junk"
  },
  material: {
    label: "DND5E.Loot.Material"
  },
  resource: {
    label: "DND5E.Loot.Resource"
  },
  treasure: {
    label: "DND5E.Loot.Treasure"
  }
};
preLocalize("lootTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * @typedef {object} CurrencyConfiguration
 * @property {string} label         Localized label for the currency.
 * @property {string} abbreviation  Localized abbreviation for the currency.
 * @property {number} conversion    Number by which this currency should be multiplied to arrive at a standard value.
 * @property {string} icon          Icon representing the currency in the interface.
 */

/**
 * The valid currency denominations with localized labels, abbreviations, and conversions.
 * The conversion number defines how many of that currency are equal to one GP.
 * @enum {CurrencyConfiguration}
 */
DND5E.currencies = {
  pp: {
    label: "DND5E.CurrencyPP",
    abbreviation: "DND5E.CurrencyAbbrPP",
    conversion: 0.1,
    icon: "systems/dnd5e/icons/currency/platinum.webp"
  },
  gp: {
    label: "DND5E.CurrencyGP",
    abbreviation: "DND5E.CurrencyAbbrGP",
    conversion: 1,
    icon: "systems/dnd5e/icons/currency/gold.webp"
  },
  ep: {
    label: "DND5E.CurrencyEP",
    abbreviation: "DND5E.CurrencyAbbrEP",
    conversion: 2,
    icon: "systems/dnd5e/icons/currency/electrum.webp"
  },
  sp: {
    label: "DND5E.CurrencySP",
    abbreviation: "DND5E.CurrencyAbbrSP",
    conversion: 10,
    icon: "systems/dnd5e/icons/currency/silver.webp"
  },
  cp: {
    label: "DND5E.CurrencyCP",
    abbreviation: "DND5E.CurrencyAbbrCP",
    conversion: 100,
    icon: "systems/dnd5e/icons/currency/copper.webp"
  }
};
preLocalize("currencies", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */

/**
 * @typedef CraftingConfiguration
 * @property {CraftingCostsMultiplier} consumable        Discounts for crafting a magical consumable.
 * @property {Record<string, CraftingCosts>} exceptions  Crafting costs for items that are exception to the general
 *                                                       crafting rules, by identifier.
 * @property {Record<string, CraftingCosts>} magic       Magic item crafting costs by rarity.
 * @property {CraftingCostsMultiplier} mundane           Multipliers for crafting mundane items.
 * @property {Record<number, CraftingCosts>} scrolls     Crafting costs for spell scrolls by level.
 */

/**
 * @typedef CraftingCostsMultiplier
 * @property {number} days  The days multiplier.
 * @property {number} gold  The gold multiplier.
 */

/**
 * @typedef CraftingCosts
 * @property {number} days  The number of days required to craft the item, not including its base item.
 * @property {number} gold  The amount of gold required for the raw materials, not including the base item.
 */

/**
 * Configuration data for crafting costs.
 * @type {CraftingConfiguration}
 */
DND5E.crafting = {
  consumable: {
    days: .5,
    gold: .5
  },
  exceptions: {
    "potion-of-healing": {
      days: 1,
      gold: 25
    }
  },
  magic: {
    common: {
      days: 5,
      gold: 50
    },
    uncommon: {
      days: 10,
      gold: 200
    },
    rare: {
      days: 50,
      gold: 2_000
    },
    veryRare: {
      days: 125,
      gold: 20_000
    },
    legendary: {
      days: 250,
      gold: 100_000
    }
  },
  mundane: {
    days: .1,
    gold: .5
  },
  scrolls: {
    0: {
      days: 1,
      gold: 15
    },
    1: {
      days: 1,
      gold: 25
    },
    2: {
      days: 3,
      gold: 100
    },
    3: {
      days: 5,
      gold: 150
    },
    4: {
      days: 10,
      gold: 1_000
    },
    5: {
      days: 25,
      gold: 1_500
    },
    6: {
      days: 40,
      gold: 10_000
    },
    7: {
      days: 50,
      gold: 12_500
    },
    8: {
      days: 60,
      gold: 15_000
    },
    9: {
      days: 120,
      gold: 50_000
    }
  }
};

/* -------------------------------------------- */
/*  Damage                                      */
/* -------------------------------------------- */

/**
 * Standard dice spread available for things like damage.
 * @type {number[]}
 */
DND5E.dieSteps = [4, 6, 8, 10, 12, 20, 100];

/* -------------------------------------------- */

/**
 * Methods by which damage scales relative to the overall scaling increase.
 * @enum {{ label: string, labelCantrip: string }}
 */
DND5E.damageScalingModes = {
  whole: {
    label: "DND5E.DAMAGE.Scaling.Whole",
    labelCantrip: "DND5E.DAMAGE.Scaling.WholeCantrip"
  },
  half: {
    label: "DND5E.DAMAGE.Scaling.Half",
    labelCantrip: "DND5E.DAMAGE.Scaling.HalfCantrip"
  }
};
preLocalize("damageScalingModes", { keys: ["label", "labelCantrip"] });

/* -------------------------------------------- */

/**
 * Configuration data for damage types.
 *
 * @typedef {object} DamageTypeConfiguration
 * @property {string} label          Localized label.
 * @property {string} icon           Icon representing this type.
 * @property {boolean} [isPhysical]  Is this a type that can be bypassed by magical or silvered weapons?
 * @property {string} [reference]    Reference to a rule page describing this damage type.
 * @property {Color} [color]         Visual color of the damage type.
 */

/**
 * Types of damage the can be caused by abilities.
 * @enum {DamageTypeConfiguration}
 */
DND5E.damageTypes = {
  acid: {
    label: "DND5E.DamageAcid",
    icon: "systems/dnd5e/icons/svg/damage/acid.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.IQhbKRPe1vCPdh8v",
    color: new Color(0x839D50)
  },
  bludgeoning: {
    label: "DND5E.DamageBludgeoning",
    icon: "systems/dnd5e/icons/svg/damage/bludgeoning.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.39LFrlef94JIYO8m",
    color: new Color(0x0000A0)
  },
  cold: {
    label: "DND5E.DamageCold",
    icon: "systems/dnd5e/icons/svg/damage/cold.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4xsFUooHDEdfhw6g",
    color: new Color(0xADD8E6)
  },
  fire: {
    label: "DND5E.DamageFire",
    icon: "systems/dnd5e/icons/svg/damage/fire.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.f1S66aQJi4PmOng6",
    color: new Color(0xFF4500)
  },
  force: {
    label: "DND5E.DamageForce",
    icon: "systems/dnd5e/icons/svg/damage/force.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.eFTWzngD8dKWQuUR",
    color: new Color(0x800080)
  },
  lightning: {
    label: "DND5E.DamageLightning",
    icon: "systems/dnd5e/icons/svg/damage/lightning.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9SaxFJ9bM3SutaMC",
    color: new Color(0x1E90FF)
  },
  necrotic: {
    label: "DND5E.DamageNecrotic",
    icon: "systems/dnd5e/icons/svg/damage/necrotic.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.klOVUV5G1U7iaKoG",
    color: new Color(0x006400)
  },
  piercing: {
    label: "DND5E.DamagePiercing",
    icon: "systems/dnd5e/icons/svg/damage/piercing.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.95agSnEGTdAmKhyC",
    color: new Color(0xC0C0C0)
  },
  poison: {
    label: "DND5E.DamagePoison",
    icon: "systems/dnd5e/icons/svg/damage/poison.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.k5wOYXdWPzcWwds1",
    color: new Color(0x8A2BE2)
  },
  psychic: {
    label: "DND5E.DamagePsychic",
    icon: "systems/dnd5e/icons/svg/damage/psychic.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.YIKbDv4zYqbE5teJ",
    color: new Color(0xFF1493)
  },
  radiant: {
    label: "DND5E.DamageRadiant",
    icon: "systems/dnd5e/icons/svg/damage/radiant.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5tcK9buXWDOw8yHH",
    color: new Color(0xFFD700)
  },
  slashing: {
    label: "DND5E.DamageSlashing",
    icon: "systems/dnd5e/icons/svg/damage/slashing.svg",
    isPhysical: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.sz2XKQ5lgsdPEJOa",
    color: new Color(0x8B0000)
  },
  thunder: {
    label: "DND5E.DamageThunder",
    icon: "systems/dnd5e/icons/svg/damage/thunder.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iqsmMHk7FSpiNkQy",
    color: new Color(0x708090)
  }
};
preLocalize("damageTypes", { keys: ["label"], sort: true });

/* -------------------------------------------- */

/**
 * Display aggregated damage in chat cards.
 * @type {boolean}
 */
DND5E.aggregateDamageDisplay = true;
/* -------------------------------------------- */

/**
 * Different types of healing that can be applied using abilities.
 * @enum {string}
 */
DND5E.healingTypes = {
  healing: {
    label: "DND5E.Healing",
    icon: "systems/dnd5e/icons/svg/damage/healing.svg",
    color: new Color(0x46C252)
  },
  temphp: {
    label: "DND5E.HealingTemp",
    icon: "systems/dnd5e/icons/svg/damage/temphp.svg",
    color: new Color(0x4B66DE)
  }
};
preLocalize("healingTypes", { keys: ["label"] });

/* -------------------------------------------- */
/*  Movement                                    */
/* -------------------------------------------- */

/**
 * Types of terrain that can cause difficult terrain.
 * @enum {{ label: string }}
 */
DND5E.difficultTerrainTypes = {
  ice: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Ice"
  },
  liquid: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Liquid"
  },
  plants: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Plants"
  },
  rocks: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Rocks"
  },
  slope: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Slope"
  },
  snow: {
    label: "DND5E.REGIONBEHAVIORS.DIFFICULTTERRAIN.Type.Snow"
  }
};
preLocalize("difficultTerrainTypes", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * @typedef MovementTypeConfig
 * @property {string} label            Localized label for the movement type.
 * @property {boolean} [walkFallback]  When this special movement type runs out, can the actor fall back to using their
 *                                     walk speed at 2x cost?
 */

/**
 * Types of movement supported by creature actors in the system.
 * @enum {MovementTypeConfig}
 */
DND5E.movementTypes = {
  burrow: {
    label: "DND5E.MovementBurrow"
  },
  climb: {
    label: "DND5E.MovementClimb",
    walkFallback: true
  },
  fly: {
    label: "DND5E.MovementFly"
  },
  swim: {
    label: "DND5E.MovementSwim",
    walkFallback: true
  },
  walk: {
    label: "DND5E.MovementWalk"
  }
};
preLocalize("movementTypes", { key: "label", sort: true });
patchConfig("movementTypes", "label", { since: "DnD5e 5.1", until: "DnD5e 5.3" });

/* -------------------------------------------- */

/**
 * @typedef TravelPaceConfig
 * @property {string} label       The human-readable label.
 * @property {number} standard    The standard pace value in miles per day.
 * @property {number} multiplier  The speed up or slow down factor for this travel pace.
 */

/**
 * Available travel paces.
 * @type {Readonly<Record<string, TravelPaceConfig>>}
 */
DND5E.travelPace = Object.freeze({
  slow: {
    label: "DND5E.Travel.Pace.Slow",
    standard: 18,
    multiplier: 2 / 3
  },
  normal: {
    label: "DND5E.Travel.Pace.Normal",
    standard: 24,
    multiplier: 1
  },
  fast: {
    label: "DND5E.Travel.Pace.Fast",
    standard: 30,
    multiplier: 4 / 3
  }
});
preLocalize("travelPace", { key: "label" });

/* -------------------------------------------- */
/*  Measurement                                 */
/* -------------------------------------------- */

/**
 * Default units used for imperial & metric settings.
 * @enum {{ imperial: string, metric: string }}
 */
DND5E.defaultUnits = {
  length: {
    imperial: "ft",
    metric: "m"
  },
  travel: {
    imperial: "mi",
    metric: "km"
  },
  volume: {
    imperial: "cubicFoot",
    metric: "liter"
  },
  weight: {
    imperial: "lb",
    metric: "kg"
  }
};

/* -------------------------------------------- */

/**
 * @typedef {object} UnitConfiguration
 * @property {string} label              Localized label for the unit.
 * @property {string} abbreviation       Localized abbreviation for the unit.
 * @property {number} conversion         Multiplier used to convert between various units.
 * @property {string} [counted]          Localization path for counted plural forms in various unit display modes.
 *                                       Only necessary if non-supported unit or using a non-standard name for a
 *                                       supported unit.
 * @property {string} [formattingUnit]   Unit formatting value as supported by javascript's internationalization system:
 *                                       https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers. Only
 *                                       required if the formatting name doesn't match the unit key.
 * @property {"imperial"|"metric"} type  Whether this is an "imperial" or "metric" unit.
 * @property {"day"|"round"} [travelResolution]  Whether the distance is per-round or per-day when used in the context
 *                                               of overland travel.
 */

/**
 * The valid units of measure for movement distances in the game system.
 * @enum {UnitConfiguration}
 */
DND5E.movementUnits = {
  ft: {
    label: "DND5E.UNITS.DISTANCE.Foot.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Foot.Abbreviation",
    conversion: 1,
    formattingUnit: "foot",
    type: "imperial",
    travelResolution: "round"
  },
  mi: {
    label: "DND5E.UNITS.DISTANCE.Mile.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Mile.Abbreviation",
    conversion: 5_280,
    formattingUnit: "mile",
    type: "imperial",
    travelResolution: "day"
  },
  m: {
    label: "DND5E.UNITS.DISTANCE.Meter.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Meter.Abbreviation",
    conversion: 10 / 3, // D&D uses a simplified 5ft -> 1.5m conversion.
    formattingUnit: "meter",
    type: "metric",
    travelResolution: "round"
  },
  km: {
    label: "DND5E.UNITS.DISTANCE.Kilometer.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Kilometer.Abbreviation",
    conversion: 10_000 / 3, // Matching simplified conversion
    formattingUnit: "kilometer",
    type: "metric",
    travelResolution: "day"
  }
};
preLocalize("movementUnits", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */

/**
 * The types of range that are used for measuring actions and effects.
 * @enum {string}
 */
DND5E.rangeTypes = {
  self: "DND5E.DistSelf",
  touch: "DND5E.DistTouch",
  spec: "DND5E.Special",
  any: "DND5E.DistAny"
};
preLocalize("rangeTypes");

/* -------------------------------------------- */

/**
 * The valid units of measure for the range of an action or effect. A combination of `DND5E.movementUnits` and
 * `DND5E.rangeUnits`.
 * @enum {string}
 */
DND5E.distanceUnits = {
  ...Object.fromEntries(Object.entries(DND5E.movementUnits).map(([k, { label }]) => [k, label])),
  ...DND5E.rangeTypes
};
preLocalize("distanceUnits");

/* -------------------------------------------- */

/**
 * The valid units for measurement of volume.
 * @enum {UnitConfiguration}
 */
DND5E.volumeUnits = {
  cubicFoot: {
    label: "DND5E.UNITS.VOLUME.CubicFoot.Label",
    abbreviation: "DND5E.UNITS.Volume.CubicFoot.Abbreviation",
    counted: "DND5E.UNITS.Volume.CubicFoot.Counted",
    conversion: 1,
    type: "imperial"
  },
  liter: {
    label: "DND5E.UNITS.VOLUME.Liter.Label",
    abbreviation: "DND5E.UNITS.Volume.Liter.Abbreviation",
    conversion: 1 / 28.317,
    type: "metric"
  }
};
preLocalize("volumeUnits", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */

/**
 * The valid units for measurement of weight.
 * @enum {UnitConfiguration}
 */
DND5E.weightUnits = {
  lb: {
    label: "DND5E.UNITS.WEIGHT.Pound.Label",
    abbreviation: "DND5E.UNITS.WEIGHT.Pound.Abbreviation",
    conversion: 1,
    formattingUnit: "pound",
    type: "imperial"
  },
  tn: {
    label: "DND5E.UNITS.WEIGHT.Ton.Label",
    abbreviation: "DND5E.UNITS.WEIGHT.Ton.Abbreviation",
    counted: "DND5E.UNITS.WEIGHT.Ton.Counted",
    conversion: 2000,
    type: "imperial"
  },
  kg: {
    label: "DND5E.UNITS.WEIGHT.Kilogram.Label",
    abbreviation: "DND5E.UNITS.WEIGHT.Kilogram.Abbreviation",
    conversion: 2.5,
    formattingUnit: "kilogram",
    type: "metric"
  },
  Mg: {
    label: "DND5E.UNITS.WEIGHT.Megagram.Label",
    abbreviation: "DND5E.UNITS.WEIGHT.Megagram.Abbreviation",
    counted: "DND5E.UNITS.WEIGHT.Megagram.Counted",
    conversion: 2500,
    type: "metric"
  }
};
preLocalize("weightUnits", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */

/**
 * Encumbrance configuration data.
 *
 * @typedef {object} EncumbranceConfiguration
 * @property {Record<string, number>} currencyPerWeight  Pieces of currency that equal a base weight (lbs or kgs).
 * @property {Record<string, object>} effects            Data used to create encumbrance-related Active Effects.
 * @property {object} threshold                          Amount to multiply strength to get given capacity threshold.
 * @property {Record<string, number>} threshold.encumbered
 * @property {Record<string, number>} threshold.heavilyEncumbered
 * @property {Record<string, number>} threshold.maximum
 * @property {Record<string, {ft: number, m: number}>} speedReduction  Speed reduction caused by encumbered status.
 * @property {Record<string, number>} vehicleWeightMultiplier  Multiplier used to determine vehicle carrying capacity.
 * @property {Record<string, Record<string, string>>} baseUnits  Base units used to calculate carrying weight.
 */

/**
 * Configure aspects of encumbrance calculation so that it could be configured by modules.
 * @type {EncumbranceConfiguration}
 */
DND5E.encumbrance = {
  currencyPerWeight: {
    imperial: 50,
    metric: 110
  },
  effects: {
    encumbered: {
      name: "EFFECT.DND5E.StatusEncumbered",
      img: "systems/dnd5e/icons/svg/statuses/encumbered.svg"
    },
    heavilyEncumbered: {
      name: "EFFECT.DND5E.StatusHeavilyEncumbered",
      img: "systems/dnd5e/icons/svg/statuses/heavily-encumbered.svg"
    },
    exceedingCarryingCapacity: {
      name: "EFFECT.DND5E.StatusExceedingCarryingCapacity",
      img: "systems/dnd5e/icons/svg/statuses/exceeding-carrying-capacity.svg"
    }
  },
  threshold: {
    encumbered: {
      imperial: 5,
      metric: 2.5
    },
    heavilyEncumbered: {
      imperial: 10,
      metric: 5
    },
    maximum: {
      imperial: 15,
      metric: 7.5
    }
  },
  speedReduction: {
    encumbered: {
      ft: 10,
      m: 3
    },
    heavilyEncumbered: {
      ft: 20,
      m: 6
    },
    exceedingCarryingCapacity: {
      ft: 5,
      m: 1.5
    }
  },
  baseUnits: {
    default: {
      imperial: "lb",
      metric: "kg"
    },
    vehicle: {
      imperial: "tn",
      metric: "Mg"
    }
  }
};
preLocalize("encumbrance.effects", { key: "name" });

/* -------------------------------------------- */
/*  Targeting                                   */
/* -------------------------------------------- */

/**
 * @typedef {object} IndividualTargetDefinition
 * @property {string} label           Localized label for this type.
 * @property {string} [counted]       Localization path for counted plural forms. Only necessary for scalar types.
 * @property {boolean} [scalar=true]  Can this target take an associated numeric value?
 */

/**
 * Targeting types that apply to one or more distinct targets.
 * @enum {IndividualTargetDefinition}
 */
DND5E.individualTargetTypes = {
  self: {
    label: "DND5E.TARGET.Type.Self.Label",
    scalar: false
  },
  ally: {
    label: "DND5E.TARGET.Type.Ally.Label",
    counted: "DND5E.TARGET.Type.Ally.Counted"
  },
  enemy: {
    label: "DND5E.TARGET.Type.Enemy.Label",
    counted: "DND5E.TARGET.Type.Enemy.Counted"
  },
  creature: {
    label: "DND5E.TARGET.Type.Creature.Label",
    counted: "DND5E.TARGET.Type.Creature.Counted"
  },
  object: {
    label: "DND5E.TARGET.Type.Object.Label",
    counted: "DND5E.TARGET.Type.Object.Counted"
  },
  space: {
    label: "DND5E.TARGET.Type.Space.Label",
    counted: "DND5E.TARGET.Type.Space.Counted"
  },
  creatureOrObject: {
    label: "DND5E.TARGET.Type.CreatureOrObject.Label",
    counted: "DND5E.TARGET.Type.CreatureOrObject.Counted"
  },
  any: {
    label: "DND5E.TARGET.Type.Any.Label",
    counted: "DND5E.TARGET.Type.Target.Counted"
  },
  willing: {
    label: "DND5E.TARGET.Type.WillingCreature.Label",
    counted: "DND5E.TARGET.Type.WillingCreature.Counted"
  }
};
preLocalize("individualTargetTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * Information needed to represent different area of effect target types.
 *
 * @typedef {object} AreaTargetDefinition
 * @property {string} label        Localized label for this type.
 * @property {string} counted      Localization path for counted plural forms.
 * @property {string} template     Type of `MeasuredTemplate` create for this target type.
 * @property {string} [reference]  Reference to a rule page describing this area of effect.
 * @property {string[]} [sizes]    List of available sizes for this template. Options are chosen from the list:
 *                                 "radius", "width", "height", "length", "thickness". No more than 3 dimensions
 *                                 may be specified.
 * @property {boolean} [standard]  Is this a standard area of effect as defined explicitly by the rules?
 */

/**
 * Targeting types that cover an area.
 * @enum {AreaTargetDefinition}
 */
DND5E.areaTargetTypes = {
  circle: {
    label: "DND5E.TARGET.Type.Circle.Label",
    counted: "DND5E.TARGET.Type.Circle.Counted",
    template: "circle",
    sizes: ["radius"]
  },
  cone: {
    label: "DND5E.TARGET.Type.Cone.Label",
    counted: "DND5E.TARGET.Type.Cone.Counted",
    template: "cone",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.DqqAOr5JnX71OCOw",
    sizes: ["length"],
    standard: true
  },
  cube: {
    label: "DND5E.TARGET.Type.Cube.Label",
    counted: "DND5E.TARGET.Type.Cube.Counted",
    template: "rect",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.dRfDIwuaHmUQ06uA",
    sizes: ["width"],
    standard: true
  },
  cylinder: {
    label: "DND5E.TARGET.Type.Cylinder.Label",
    counted: "DND5E.TARGET.Type.Cylinder.Counted",
    template: "circle",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jZFp4R7tXsIqkiG3",
    sizes: ["radius", "height"],
    standard: true
  },
  line: {
    label: "DND5E.TARGET.Type.Line.Label",
    counted: "DND5E.TARGET.Type.Line.Counted",
    template: "ray",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6DOoBgg7okm9gBc6",
    sizes: ["length", "width"],
    standard: true
  },
  radius: {
    label: "DND5E.TARGET.Type.Emanation.Label",
    counted: "DND5E.TARGET.Type.Emanation.Counted",
    template: "circle",
    standard: true
  },
  sphere: {
    label: "DND5E.TARGET.Type.Sphere.Label",
    counted: "DND5E.TARGET.Type.Sphere.Counted",
    template: "circle",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.npdEWb2egUPnB5Fa",
    sizes: ["radius"],
    standard: true
  },
  square: {
    label: "DND5E.TARGET.Type.Square.Label",
    counted: "DND5E.TARGET.Type.Square.Counted",
    template: "rect",
    sizes: ["width"]
  },
  wall: {
    label: "DND5E.TARGET.Type.Wall.Label",
    counted: "DND5E.TARGET.Type.Wall.Counted",
    template: "ray",
    sizes: ["length", "thickness", "height"]
  }
};
preLocalize("areaTargetTypes", { key: "label", sort: true });

Object.defineProperty(DND5E, "areaTargetOptions", {
  get() {
    const { primary, secondary } = Object.entries(this.areaTargetTypes).reduce((obj, [value, data]) => {
      const entry = { value, label: data.label };
      if ( data.standard ) obj.primary.push(entry);
      else obj.secondary.push(entry);
      return obj;
    }, { primary: [], secondary: [] });
    return [{ value: "", label: "" }, ...primary, { rule: true }, ...secondary];
  }
});

/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
DND5E.targetTypes = {
  ...Object.fromEntries(Object.entries(DND5E.individualTargetTypes).map(([k, v]) => [k, v.label])),
  ...Object.fromEntries(Object.entries(DND5E.areaTargetTypes).map(([k, v]) => [k, v.label]))
};
preLocalize("targetTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Denominations of hit dice which can apply to classes.
 * @type {string[]}
 */
DND5E.hitDieTypes = ["d4", "d6", "d8", "d10", "d12"];

/* -------------------------------------------- */

/**
 * Configuration data for rest types.
 *
 * @typedef {object} RestConfiguration
 * @property {Record<string, number>} duration      Duration of different rest variants in minutes.
 * @property {string} label                         Localized label for the rest type.
 * @property {string} icon                          Icon representing this rest type. Can be either a set of FontAwesome
 *                                                  classes or an image path.
 * @property {string[]} [activationPeriods]         Activation types that should be displayed in the chat card.
 * @property {number} [exhaustionDelta]             Delta exhaustion to apply to creatures undergoing the rest.
 * @property {boolean} [recoverHitDice]             Should hit dice be recovered during this rest?
 * @property {boolean} [recoverHitPoints]           Should hit points be recovered during this rest?
 * @property {string[]} [recoverPeriods]            What recovery periods should be applied when this rest is taken. The
 *                                                  ordering of the periods determines which is applied if more than one
 *                                                  recovery profile is found.
 * @property {Set<string>} [recoverSpellSlotTypes]  Types of spellcasting slots to recover during this rest.
 */

/**
 * Types of rests.
 * @enum {RestConfiguration}
 */
DND5E.restTypes = {
  short: {
    duration: {
      normal: 60,
      gritty: 480,
      epic: 1
    },
    label: "DND5E.REST.Short.Label",
    icon: "fa-solid fa-utensils",
    activationPeriods: ["shortRest"],
    recoverPeriods: ["sr"],
    recoverSpellSlotTypes: new Set(["pact"])
  },
  long: {
    duration: {
      normal: 480,
      gritty: 10_080,
      epic: 60
    },
    exhaustionDelta: -1,
    label: "DND5E.REST.Long.Label",
    icon: "fa-solid fa-campground",
    activationPeriods: ["longRest"],
    recoverHitDice: true,
    recoverHitPoints: true,
    recoverPeriods: ["lr", "sr"],
    recoverSpellSlotTypes: new Set(["spell", "pact"]),
    recoverTemp: true,
    recoverTempMax: true
  }
};
preLocalize("restTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * The set of possible sensory perception types which an Actor may have.
 * @enum {string}
 */
DND5E.senses = {
  blindsight: "DND5E.SenseBlindsight",
  darkvision: "DND5E.SenseDarkvision",
  tremorsense: "DND5E.SenseTremorsense",
  truesight: "DND5E.SenseTruesight"
};
preLocalize("senses", { sort: true });

/* -------------------------------------------- */
/*  Attacks                                     */
/* -------------------------------------------- */

/**
 * Classifications of attacks based on what is performing them.
 * @enum {{ label: string }}
 */
DND5E.attackClassifications = {
  weapon: {
    label: "DND5E.ATTACK.Classification.Weapon"
  },
  spell: {
    label: "DND5E.ATTACK.Classification.Spell"
  },
  unarmed: {
    label: "DND5E.ATTACK.Classification.Unarmed"
  }
};
preLocalize("attackClassifications", { key: "label" });

/* -------------------------------------------- */

/**
 * Attack modes available for weapons.
 * @enum {string}
 */
DND5E.attackModes = Object.seal({
  oneHanded: {
    label: "DND5E.ATTACK.Mode.OneHanded"
  },
  twoHanded: {
    label: "DND5E.ATTACK.Mode.TwoHanded"
  },
  offhand: {
    label: "DND5E.ATTACK.Mode.Offhand"
  },
  ranged: {
    label: "DND5E.ATTACK.Mode.Ranged"
  },
  thrown: {
    label: "DND5E.ATTACK.Mode.Thrown"
  },
  "thrown-offhand": {
    label: "DND5E.ATTACK.Mode.ThrownOffhand"
  }
});
preLocalize("attackModes", { key: "label" });

/* -------------------------------------------- */

/**
 * Types of attacks based on range.
 * @enum {{ label: string }}
 */
DND5E.attackTypes = Object.seal({
  melee: {
    label: "DND5E.ATTACK.Type.Melee"
  },
  ranged: {
    label: "DND5E.ATTACK.Type.Ranged"
  }
});
preLocalize("attackTypes", { key: "label" });

/* -------------------------------------------- */
/*  Spellcasting                                */
/* -------------------------------------------- */

/**
 * Define the standard slot progression by character level.
 * The entries of this array represent the spell slot progression for a full spell-caster.
 * @type {SpellcastingTable5e}
 */
const SPELL_SLOT_TABLE = DND5E.SPELL_SLOT_TABLE = [
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
 * Define the pact slot & level progression by pact caster level.
 * @type {SpellcastingTableSingle5e}
 */
const pactCastingProgression = DND5E.pactCastingProgression = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 }
};

/* -------------------------------------------- */

/**
 * @typedef SpellcastingMethod5e
 * @property {string} label                                              The human-readable label.
 * @property {"none"|"single"|"multi"} [type="none"]                     "none" - No spell slots.
 *                                                                       "single" - Spell slots of a single level only.
 *                                                                       "multi" - Spell slots of multiple levels.
 * @property {SpellcastingTable5e|SpellcastingTableSingle5e} [table]     The spell slot progression table.
 * @property {string} [img]                                              The icon to use if this spellcasting method is
 *                                                                       favorited.
 * @property {number} order                                              The ordering of this spellcasting method on an
 *                                                                       actor sheet's spells tab, ascending.
 * @property {boolean} [cantrips]                                        Whether this spellcasting method includes
 *                                                                       cantrips.
 * @property {object} [exclusive]                                        Exclusivity options.
 * @property {boolean} [exclusive.slots]                                 Whether the slots provided by this spellcasting
 *                                                                       method may only be used to cast spells that use
 *                                                                       this spellcasting method.
 * @property {boolean} [exclusive.spells]                                Whether spells that use this spellcasting
 *                                                                       method may only be cast with slots provided by
 *                                                                       this spellcasting method.
 * @property {boolean} [prepares]                                        Whether spells using this method are variably
 *                                                                       available for casting. In 2024 this term was
 *                                                                       unified to 'prepares', but 2014 uses different
 *                                                                       nomenclature for different classes.
 * @property {Record<string, SpellcastingProgression5e>} [progression]   Spell slot progressions available for this
 *                                                                       method.
 */

/**
 * @typedef {number[][]} SpellcastingTable5e
 */

/**
 * @typedef {Record<number, SpellcastingTableEntry5e>} SpellcastingTableSingle5e
 */

/**
 * @typedef SpellcastingTableEntry5e
 * @property {number} slots  The number of slots available.
 * @property {number} level  The level of the slots.
 */

/**
 * @typedef SpellcastingProgression5e
 * @property {string} label       The human-readable label.
 * @property {number} divisor     How much this progression mode contributes to the base progression of the spellcasting
 *                                method.
 * @property {boolean} [roundUp]  Whether to round up or down when determining contribution.
 */

/**
 * Available spellcasting methods.
 * @type {Record<string, SpellcastingMethod5e>}
 */
DND5E.spellcasting = {
  atwill: {
    label: "DND5E.SPELLCASTING.METHODS.AtWill.label",
    order: -30
  },
  innate: {
    label: "DND5E.SPELLCASTING.METHODS.Innate.label",
    order: -20
  },
  ritual: {
    label: "DND5E.SPELLCASTING.METHODS.Ritual.label",
    order: -10
  },
  pact: {
    label: "DND5E.SPELLCASTING.METHODS.Pact.label",
    type: "single",
    cantrips: true,
    prepares: true,
    order: 10,
    img: "icons/magic/unholy/silhouette-robe-evil-power.webp",
    table: pactCastingProgression,
    progression: {
      pact: {
        label: "DND5E.SPELLCASTING.METHODS.Pact.Full.label",
        divisor: 1
      }
    }
  },
  spell: {
    label: "DND5E.SPELLCASTING.METHODS.Spell.label",
    type: "multi",
    cantrips: true,
    prepares: true,
    order: 20,
    img: "systems/dnd5e/icons/spell-tiers/{id}.webp",
    table: SPELL_SLOT_TABLE,
    progression: {
      full: {
        label: "DND5E.SPELLCASTING.METHODS.Spell.Full.label",
        divisor: 1
      },
      half: {
        label: "DND5E.SPELLCASTING.METHODS.Spell.Half.label",
        divisor: 2,
        roundUp: true
      },
      third: {
        label: "DND5E.SPELLCASTING.METHODS.Spell.Third.label",
        divisor: 3
      },
      artificer: {
        label: "DND5E.SPELLCASTING.METHODS.Spell.Artificer.label",
        divisor: 2,
        roundUp: true
      }
    }
  }
};
preLocalize("spellcasting", { key: "label" });
preLocalize("spellcasting.spell.progression", { key: "label" });
preLocalize("spellcasting.pact.progression", { key: "label" });

/* -------------------------------------------- */

/**
 * @typedef SpellcastingPreparationState5e
 * @property {string} label  The human-readable label.
 * @property {number} value  A unique number representing this state.
 */

/**
 * Spell preparation states.
 * @type {Record<string, SpellcastingPreparationState5e>}
 */
DND5E.spellPreparationStates = {
  unprepared: {
    label: "DND5E.SPELLCASTING.STATES.Unprepared",
    value: 0
  },
  prepared: {
    label: "DND5E.SPELLCASTING.STATES.Prepared",
    value: 1
  },
  always: {
    label: "DND5E.SPELLCASTING.STATES.AlwaysPrepared",
    value: 2
  }
};
preLocalize("spellPreparationStates", { key: "label" });

/* -------------------------------------------- */

/**
 * Spell lists that will be registered by the system during init.
 * @type {string[]}
 */
DND5E.SPELL_LISTS = Object.freeze([
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.wwia6Wwo4BgE9GSI",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.SkHptN2PTzFGDaEj",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.LhvuDQEyrCdg5EfU",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.8yD9Jgp404hfZ9ie",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.5HnIk6HsrSxkvkz5",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.VfZ5mH2ZuyFq82Ga",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.sSzagq8GvYXpfmfs",
  "Compendium.dnd5e.content24.JournalEntry.phbSpells0000000.JournalEntryPage.6AnqLUowgdsqMFvz",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsLife000000",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsLandArid00",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsLandPolar0",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsLandTemper",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsLandTropic",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsDevotion00",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsDraconic00",
  "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.spellsFiend00000"
]);

/* -------------------------------------------- */

/**
 * @deprecated since 5.1
 * @ignore
 */
DND5E.spellPreparationModes = new Proxy(DND5E.spellcasting, {
  get(target, prop, receiver) {
    foundry.utils.logCompatibilityWarning("CONFIG.DND5E.spellPreparationModes is deprecated, use CONFIG.DND5E.spellcasting"
      + " instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    if ( (prop === "prepared") || (prop === "always") ) prop = "spell";
    return Reflect.get(target, prop, receiver);
  },

  set(target, prop, value, receiver) {
    foundry.utils.logCompatibilityWarning("CONFIG.DND5E.spellPreparationModes is deprecated, use CONFIG.DND5E.spellcasting"
      + " instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    if ( (prop === "prepared") || (prop === "always") ) prop = "spell";
    return Reflect.set(target, prop, value, receiver);
  }
});

/* -------------------------------------------- */

/**
 * @deprecated since 5.1
 * @ignore
 */
DND5E.spellcastingTypes = new Proxy(DND5E.spellcasting, {
  get(target, prop, receiver) {
    foundry.utils.logCompatibilityWarning("CONFIG.DND5E.spellcastingTypes is deprecated, use CONFIG.DND5E.spellcasting"
      + " instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    if ( prop === "leveled" ) prop = "spell";
    return Reflect.get(target, prop, receiver);
  },

  set(target, prop, value, receiver) {
    foundry.utils.logCompatibilityWarning("CONFIG.DND5E.spellcastingTypes is deprecated, use CONFIG.DND5E.spellcasting"
      + " instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    if ( prop === "leveled" ) prop = "spell";
    if ( !("type" in value) ) value.type = "single";
    if ( !("table" in value) ) value.table = DND5E.pactCastingProgression;
    if ( !("progression" in value) ) value.progression = { [prop]: { label: value.label } };
    return Reflect.set(target, prop, value, receiver);
  }
});

/* -------------------------------------------- */

/**
 * @ignore
 */
DND5E.spellProgression = new Proxy({}, {
  set() {
    foundry.utils.logCompatibilityWarning("CONFIG.DND5E.spellProgression is read-only. Spell progressions must be set "
      + "on CONFIG.DND5E.spellcasting instead.", { since: "DnD5e 5.1", until: "DnD5e 5.4" });
    return true;
  }
});


/* -------------------------------------------- */

/**
 * Valid spell levels.
 * @enum {string}
 */
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
preLocalize("spellLevels");

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed.
 * @enum {string}
 */
DND5E.spellScalingModes = {
  none: "DND5E.SpellNone",
  cantrip: "DND5E.SpellCantrip",
  level: "DND5E.SpellLevel"
};
preLocalize("spellScalingModes", { sort: true });

/* -------------------------------------------- */

/**
 * Configuration data for spell schools.
 *
 * @typedef {object} SpellSchoolConfiguration
 * @property {string} label        Localized label.
 * @property {string} icon         Spell school icon.
 * @property {string} fullKey      Fully written key used as alternate for enrichers.
 * @property {string} [reference]  Reference to a rule page describing this school.
 */

/**
 * Schools to which a spell can belong.
 * @enum {SpellSchoolConfiguration}
 */
DND5E.spellSchools = {
  abj: {
    label: "DND5E.SchoolAbj",
    icon: "systems/dnd5e/icons/svg/schools/abjuration.svg",
    fullKey: "abjuration",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.849AYEWw9FHD6JNz"
  },
  con: {
    label: "DND5E.SchoolCon",
    icon: "systems/dnd5e/icons/svg/schools/conjuration.svg",
    fullKey: "conjuration",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.TWyKMhZJZGqQ6uls"
  },
  div: {
    label: "DND5E.SchoolDiv",
    icon: "systems/dnd5e/icons/svg/schools/divination.svg",
    fullKey: "divination",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.HoD2MwzmVbMqj9se"
  },
  enc: {
    label: "DND5E.SchoolEnc",
    icon: "systems/dnd5e/icons/svg/schools/enchantment.svg",
    fullKey: "enchantment",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.SehPXk24ySBVOwCZ"
  },
  evo: {
    label: "DND5E.SchoolEvo",
    icon: "systems/dnd5e/icons/svg/schools/evocation.svg",
    fullKey: "evocation",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kGp1RNuxL2SELLRC"
  },
  ill: {
    label: "DND5E.SchoolIll",
    icon: "systems/dnd5e/icons/svg/schools/illusion.svg",
    fullKey: "illusion",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.smEk7kvVyslFozrB"
  },
  nec: {
    label: "DND5E.SchoolNec",
    icon: "systems/dnd5e/icons/svg/schools/necromancy.svg",
    fullKey: "necromancy",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.W0eyiV1FBmngb6Qh"
  },
  trs: {
    label: "DND5E.SchoolTrs",
    icon: "systems/dnd5e/icons/svg/schools/transmutation.svg",
    fullKey: "transmutation",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.IYWewSailtmv6qEb"
  }
};
preLocalize("spellSchools", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * Types of spell lists.
 * @enum {string}
 */
DND5E.spellListTypes = {
  class: "TYPES.Item.class",
  subclass: "TYPES.Item.subclass",
  background: "TYPES.Item.background",
  race: "TYPES.Item.race",
  other: "JOURNALENTRYPAGE.DND5E.SpellList.Type.Other"
};
preLocalize("spellListTypes");

/* -------------------------------------------- */

/**
 * Spell scroll item ID within the `DND5E.sourcePacks` compendium or a full UUID for each spell level.
 * @enum {string}
 */
DND5E.spellScrollIds = {
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

/* -------------------------------------------- */

/**
 * @typedef {object} SpellScrollValues
 * @property {number} bonus  Attack to hit bonus.
 * @property {number} dc     Saving throw DC.
 */

/**
 * Spell scroll save DCs and attack bonus values based on spell level. If matching level isn't found,
 * then the nearest level lower than it will be selected.
 * @enum {SpellScrollValues}
 */
DND5E.spellScrollValues = {
  0: { dc: 13, bonus: 5 },
  3: { dc: 15, bonus: 7 },
  5: { dc: 17, bonus: 9 },
  7: { dc: 18, bonus: 10 },
  9: { dc: 19, bonus: 11 }
};

/* -------------------------------------------- */

/**
 * Compendium packs used for localized items.
 * @enum {string}
 */
DND5E.sourcePacks = {
  BACKGROUNDS: "dnd5e.backgrounds",
  CLASSES: "dnd5e.classes",
  ITEMS: "dnd5e.items",
  RACES: "dnd5e.races"
};

/* -------------------------------------------- */

/**
 * @import { TransformationSettingData } from "./data/settings/transformation-setting.mjs";
 */

/**
 * @typedef TransformationConfiguration
 * @property {Record<string, TransformationFlagConfiguration>} effects
 * @property {Record<string, TransformationFlagConfiguration>} keep
 * @property {Record<string, TransformationFlagConfiguration>} merge
 * @property {Record<string, TransformationFlagConfiguration>} others
 * @property {Record<string, TransformationPresetConfiguration} presets
 */

/**
 * @typedef TransformationFlagConfiguration
 * @property {string} label         Localized label for the flag.
 * @property {string} [hint]        Localized hint for the flag.
 * @property {boolean} [default]    This should be part of the default transformation settings.
 * @property {string[]} [disables]  Names of specific settings to disable, or whole categories if an `*` is used.
 */

/**
 * @typedef TransformationPresetConfiguration
 * @property {string} icon                         Icon representing this preset on the button.
 * @property {string} label                        Localized label for the preset.
 * @property {TransformationSettingData} settings  Options that will be set for the preset.
 */

/**
 * Settings that configuration how actors are changed when transformation is applied.
 * @typedef {TransformationConfiguration}
 */
DND5E.transformation = {
  effects: {
    all: {
      label: "DND5E.TRANSFORM.Setting.Effects.All.Label",
      hint: "DND5E.TRANSFORM.Setting.Effects.All.Hint",
      disables: ["effects.*"]
    },
    origin: {
      label: "DND5E.TRANSFORM.Setting.Effects.Origin.Label",
      hint: "DND5E.TRANSFORM.Setting.Effects.Origin.Hint",
      default: true
    },
    otherOrigin: {
      label: "DND5E.TRANSFORM.Setting.Effects.OtherOrigin.Label",
      hint: "DND5E.TRANSFORM.Setting.Effects.OtherOrigin.Hint",
      default: true
    },
    background: {
      label: "DND5E.TRANSFORM.Setting.Effects.Background.Label",
      default: true
    },
    class: {
      label: "DND5E.TRANSFORM.Setting.Effects.Class.Label",
      default: true
    },
    feat: {
      label: "DND5E.TRANSFORM.Setting.Effects.Feature.Label",
      default: true
    },
    equipment: {
      label: "DND5E.TRANSFORM.Setting.Effects.Equipment.Label",
      default: true
    },
    spell: {
      label: "DND5E.TRANSFORM.Setting.Effects.Spell.Label",
      default: true
    }
  },
  keep: {
    physical: {
      label: "DND5E.TRANSFORM.Setting.Keep.Physical.Label",
      hint: "DND5E.TRANSFORM.Setting.Keep.Physical.Hint"
    },
    mental: {
      label: "DND5E.TRANSFORM.Setting.Keep.Mental.Label",
      hint: "DND5E.TRANSFORM.Setting.Keep.Mental.Hint"
    },
    saves: {
      label: "DND5E.TRANSFORM.Setting.Keep.Saves.Label",
      disables: ["merge.saves"]
    },
    skills: {
      label: "DND5E.TRANSFORM.Setting.Keep.Skills.Label",
      disables: ["merge.skills"]
    },
    gearProf: {
      label: "DND5E.TRANSFORM.Setting.Keep.GearProficiency.Label"
    },
    languages: {
      label: "DND5E.TRANSFORM.Setting.Keep.Languages.Label"
    },
    class: {
      label: "DND5E.TRANSFORM.Setting.Keep.Proficiency.Label"
    },
    feats: {
      label: "DND5E.TRANSFORM.Setting.Keep.Features.Label"
    },
    items: {
      label: "DND5E.TRANSFORM.Setting.Keep.Equipment.Label"
    },
    spells: {
      label: "DND5E.TRANSFORM.Setting.Keep.Spells.Label"
    },
    bio: {
      label: "DND5E.TRANSFORM.Setting.Keep.Biography.Label"
    },
    type: {
      label: "DND5E.TRANSFORM.Setting.Keep.CreatureType.Label"
    },
    hp: {
      label: "DND5E.TRANSFORM.Setting.Keep.Health.Label"
    },
    resistances: {
      label: "DND5E.TRANSFORM.Setting.Keep.Resistances.Label"
    },
    vision: {
      label: "DND5E.TRANSFORM.Setting.Keep.Vision.Label",
      default: true
    },
    self: {
      label: "DND5E.TRANSFORM.Setting.Keep.Self.Label",
      hint: "DND5E.TRANSFORM.Setting.Keep.Self.Hint",
      disables: ["keep.*", "merge.*", "minimumAC", "tempFormula"]
    }
  },
  merge: {
    saves: {
      label: "DND5E.TRANSFORM.Setting.Merge.Saves.Label",
      disables: ["keep.saves"]
    },
    skills: {
      label: "DND5E.TRANSFORM.Setting.Merge.Skills.Label",
      disables: ["keep.skills"]
    }
  },
  other: {},
  presets: {
    wildshape: {
      icon: '<i class="fas fa-paw" inert></i>',
      label: "DND5E.TRANSFORM.Preset.WildShape.Label",
      settings: {
        effects: new Set(["otherOrigin", "origin", "feat", "spell", "class", "background"]),
        keep: new Set(["bio", "class", "feats", "hp", "languages", "mental", "type"]),
        merge: new Set(["saves", "skills"]),
        minimumAC: "(13 + @abilities.wis.mod) * sign(@subclasses.moon.levels)",
        spellLists: new Set(["subclass:moon"]),
        tempFormula: "max(@classes.druid.levels, @subclasses.moon.levels * 3)"
      }
    },
    polymorph: {
      icon: '<i class="fas fa-pastafarianism" inert></i>',
      label: "DND5E.TRANSFORM.Preset.Polymorph.Label",
      settings: {
        effects: new Set(["otherOrigin", "origin", "spell"]),
        keep: new Set(["hp", "type"]),
        tempFormula: "@source.attributes.hp.max"
      }
    },
    polymorphSelf: {
      icon: '<i class="fas fa-eye" inert></i>',
      label: "DND5E.TRANSFORM.Preset.Appearance.Label",
      settings: {
        effects: new Set(["all"]),
        keep: new Set(["self"])
      }
    }
  }
};
preLocalize("transformation.effects", { keys: ["label", "hint"] });
preLocalize("transformation.keep", { keys: ["label", "hint"] });
preLocalize("transformation.merge", { keys: ["label", "hint"] });
preLocalize("transformation.other", { keys: ["label", "hint"], sort: true });
preLocalize("transformation.presets", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels.
 * The key for each level represents its proficiency multiplier.
 * @enum {string}
 */
DND5E.proficiencyLevels = {
  0: "DND5E.NotProficient",
  1: "DND5E.Proficient",
  0.5: "DND5E.HalfProficient",
  2: "DND5E.Expertise"
};
preLocalize("proficiencyLevels");

/* -------------------------------------------- */

/**
 * Weapon and armor item proficiency levels.
 * @enum {string}
 */
DND5E.weaponAndArmorProficiencyLevels = {
  0: "DND5E.NotProficient",
  1: "DND5E.Proficient"
};
preLocalize("weaponAndArmorProficiencyLevels");

/* -------------------------------------------- */

/**
 * The amount of cover provided by an object. In cases where multiple pieces
 * of cover are in play, we take the highest value.
 * @enum {string}
 */
DND5E.cover = {
  0: "DND5E.None",
  .5: "DND5E.CoverHalf",
  .75: "DND5E.CoverThreeQuarters",
  1: "DND5E.CoverTotal"
};
preLocalize("cover");

/* -------------------------------------------- */

/**
 * A selection of actor attributes that can be tracked on token resource bars.
 * @type {string[]}
 * @deprecated since v10
 */
DND5E.trackableAttributes = [
  "attributes.ac.value", "attributes.init.bonus", "attributes.movement", "attributes.senses",
  "attributes.spell.attack", "attributes.spell.dc", "attributes.spell.level", "details.cr",
  "details.xp.value", "skills.*.passive", "abilities.*.value"
];

/* -------------------------------------------- */

/**
 * A selection of actor and item attributes that are valid targets for item resource consumption.
 * @type {string[]}
 */
DND5E.consumableResources = [
  // Configured during init.
];

/* -------------------------------------------- */

/**
 * @typedef {object} _StatusEffectConfig5e
 * @property {string} img                    Image used to represent the condition on the token.
 * @property {number} [order]                Order status to the start of the token HUD, rather than alphabetically.
 * @property {string} [reference]            UUID of a journal entry with details on this condition.
 * @property {string} [special]              Set this condition as a special status effect under this name.
 * @property {string[]} [riders]             Additional conditions, by id, to apply as part of this condition.
 * @property {string} [exclusiveGroup]       Any status effects with the same group will not be able to be applied at
 *                                           the same time through the token HUD (multiple statuses applied through
 *                                           other effects can still coexist).
 * @property {number} [coverBonus]           A bonus this condition provides to AC and dexterity saving throws.
 * @property {boolean} [neverBlockMovement]  If true, a token with this status will not block movement for other tokens.
 */

/**
 * Configuration data for system status effects.
 * @typedef {Omit<StatusEffectConfig, "img"> & _StatusEffectConfig5e} StatusEffectConfig5e
 */

/**
 * @typedef {object} _ConditionConfiguration
 * @property {string} name         Localized name for the condition.
 * @property {boolean} [pseudo]    Is this a pseudo-condition, i.e. one that does not appear in the conditions appendix
 *                                 but acts as a status effect?
 * @property {number} [levels]     The number of levels of exhaustion an actor can obtain.
 * @property {{ rolls: number, speed: number }} [reduction]  Amount D20 Tests & Speed are reduced per exhaustion level
 *                                                           when using the modern rules. Speed reduction is measured
 *                                                           in the default imperial units and converted to metric
 *                                                           if necessary.
 */

/**
 * Configuration data for system conditions.
 * @typedef {Omit<StatusEffectConfig5e, "name"> & _ConditionConfiguration} ConditionConfiguration
 */

/**
 * Conditions that can affect an actor.
 * @enum {ConditionConfiguration}
 */
DND5E.conditionTypes = {
  bleeding: {
    name: "EFFECT.DND5E.StatusBleeding",
    img: "systems/dnd5e/icons/svg/statuses/bleeding.svg",
    pseudo: true
  },
  blinded: {
    name: "DND5E.ConBlinded",
    img: "systems/dnd5e/icons/svg/statuses/blinded.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.uDogReMO6QtH6NDw",
    special: "BLIND"
  },
  burning: {
    name: "EFFECT.DND5E.StatusBurning",
    img: "systems/dnd5e/icons/svg/statuses/burning.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.mPBGM1vguT5IPzxT",
    pseudo: true
  },
  charmed: {
    name: "DND5E.ConCharmed",
    img: "systems/dnd5e/icons/svg/statuses/charmed.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.vLAsIUa0FhZNsyLk"
  },
  cursed: {
    name: "EFFECT.DND5E.StatusCursed",
    img: "systems/dnd5e/icons/svg/statuses/cursed.svg",
    pseudo: true
  },
  dehydration: {
    name: "EFFECT.DND5E.StatusDehydration",
    img: "systems/dnd5e/icons/svg/statuses/dehydration.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.FZFvLNOX0lHaHZ1k",
    pseudo: true
  },
  deafened: {
    name: "DND5E.ConDeafened",
    img: "systems/dnd5e/icons/svg/statuses/deafened.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.qlRw66tJhk0zLnwq"
  },
  diseased: {
    name: "DND5E.ConDiseased",
    img: "systems/dnd5e/icons/svg/statuses/diseased.svg",
    pseudo: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.oNQWvyRZkTOJ8PBq"
  },
  exhaustion: {
    name: "DND5E.ConExhaustion",
    img: "systems/dnd5e/icons/svg/statuses/exhaustion.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.jSQtPgNm0i4f3Qi3",
    levels: 6,
    reduction: { rolls: 2, speed: 5 }
  },
  falling: {
    name: "EFFECT.DND5E.StatusFalling",
    img: "systems/dnd5e/icons/svg/statuses/falling.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kREHL5pgNUOhay9f",
    pseudo: true
  },
  frightened: {
    name: "DND5E.ConFrightened",
    img: "systems/dnd5e/icons/svg/statuses/frightened.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.93uaingTESo8N1qL"
  },
  grappled: {
    name: "DND5E.ConGrappled",
    img: "systems/dnd5e/icons/svg/statuses/grappled.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.KbQ1k0OIowtZeQgp"
  },
  incapacitated: {
    name: "DND5E.ConIncapacitated",
    img: "systems/dnd5e/icons/svg/statuses/incapacitated.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.4i3G895hy99piand",
    neverBlockMovement: true
  },
  invisible: {
    name: "DND5E.ConInvisible",
    img: "systems/dnd5e/icons/svg/statuses/invisible.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.MQIZ1zRLWRcNOtPN"
  },
  malnutrition: {
    name: "EFFECT.DND5E.StatusMalnutrition",
    img: "systems/dnd5e/icons/svg/statuses/malnutrition.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.earBo4vQPC1ti4g7",
    pseudo: true
  },
  paralyzed: {
    name: "DND5E.ConParalyzed",
    img: "systems/dnd5e/icons/svg/statuses/paralyzed.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.RnxZoTglPnLc6UPb",
    statuses: ["incapacitated"]
  },
  petrified: {
    name: "DND5E.ConPetrified",
    img: "systems/dnd5e/icons/svg/statuses/petrified.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.6vtLuQT9lwZ9N299",
    statuses: ["incapacitated"]
  },
  poisoned: {
    name: "DND5E.ConPoisoned",
    img: "systems/dnd5e/icons/svg/statuses/poisoned.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.HWs8kEojffqwTSJz"
  },
  prone: {
    name: "DND5E.ConProne",
    img: "systems/dnd5e/icons/svg/statuses/prone.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.QxCrRcgMdUd3gfzz"
  },
  restrained: {
    name: "DND5E.ConRestrained",
    img: "systems/dnd5e/icons/svg/statuses/restrained.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.dqLeGdpHtb8FfcxX"
  },
  silenced: {
    name: "EFFECT.DND5E.StatusSilenced",
    img: "systems/dnd5e/icons/svg/statuses/silenced.svg",
    pseudo: true
  },
  stunned: {
    name: "DND5E.ConStunned",
    img: "systems/dnd5e/icons/svg/statuses/stunned.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.EjbXjvyQAMlDyANI",
    statuses: ["incapacitated"]
  },
  suffocation: {
    name: "EFFECT.DND5E.StatusSuffocation",
    img: "systems/dnd5e/icons/svg/statuses/suffocation.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.gAvV8TLyS8UGq00x",
    pseudo: true
  },
  surprised: {
    name: "EFFECT.DND5E.StatusSurprised",
    img: "systems/dnd5e/icons/svg/statuses/surprised.svg",
    pseudo: true
  },
  transformed: {
    name: "EFFECT.DND5E.StatusTransformed",
    img: "systems/dnd5e/icons/svg/statuses/transformed.svg",
    pseudo: true
  },
  unconscious: {
    name: "DND5E.ConUnconscious",
    img: "systems/dnd5e/icons/svg/statuses/unconscious.svg",
    reference: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.fZCRaKEJd4KoQCqH",
    statuses: ["incapacitated"],
    riders: ["prone"]
  }
};
preLocalize("conditionTypes", { key: "name", sort: true });

/* -------------------------------------------- */

/**
 * Various effects of conditions and which conditions apply it. Either keys for the conditions,
 * and with a number appended for a level of exhaustion.
 * @enum {object}
 */
DND5E.conditionEffects = {
  noMovement: new Set(["exhaustion-5", "grappled", "paralyzed", "petrified", "restrained", "unconscious"]),
  halfMovement: new Set(["exhaustion-2"]),
  crawl: new Set(["prone", "exceedingCarryingCapacity"]),
  petrification: new Set(["petrified"]),
  halfHealth: new Set(["exhaustion-4"]),
  dehydrated: new Set(["dehydration"]),
  malnourished: new Set(["malnutrition"]),
  abilityCheckDisadvantage: new Set(["poisoned", "exhaustion-1"]),
  abilitySaveDisadvantage: new Set(["exhaustion-3"]),
  attackDisadvantage: new Set(["poisoned", "exhaustion-3"]),
  dexteritySaveDisadvantage: new Set(["restrained"]),
  initiativeAdvantage: new Set(["invisible"]),
  initiativeDisadvantage: new Set(["incapacitated", "surprised"])
};

/* -------------------------------------------- */

/**
 * Extra status effects not specified in `conditionTypes`. If the ID matches a core-provided effect, then this
 * data will be merged into the core data.
 * @enum {Omit<StatusEffectConfig5e, "img"> & { icon: string }}
 */
DND5E.statusEffects = {
  burrowing: {
    name: "EFFECT.DND5E.StatusBurrowing",
    img: "systems/dnd5e/icons/svg/statuses/burrowing.svg",
    special: "BURROW"
  },
  concentrating: {
    name: "EFFECT.DND5E.StatusConcentrating",
    img: "systems/dnd5e/icons/svg/statuses/concentrating.svg",
    special: "CONCENTRATING"
  },
  coverHalf: {
    name: "EFFECT.DND5E.StatusHalfCover",
    img: "systems/dnd5e/icons/svg/statuses/cover-half.svg",
    order: 2,
    exclusiveGroup: "cover",
    coverBonus: 2
  },
  coverThreeQuarters: {
    name: "EFFECT.DND5E.StatusThreeQuartersCover",
    img: "systems/dnd5e/icons/svg/statuses/cover-three-quarters.svg",
    order: 3,
    exclusiveGroup: "cover",
    coverBonus: 5
  },
  coverTotal: {
    name: "EFFECT.DND5E.StatusTotalCover",
    img: "systems/dnd5e/icons/svg/statuses/cover-total.svg",
    order: 4,
    exclusiveGroup: "cover"
  },
  dead: {
    name: "EFFECT.DND5E.StatusDead",
    img: "systems/dnd5e/icons/svg/statuses/dead.svg",
    special: "DEFEATED",
    order: 1,
    neverBlockMovement: true
  },
  dodging: {
    name: "EFFECT.DND5E.StatusDodging",
    img: "systems/dnd5e/icons/svg/statuses/dodging.svg"
  },
  ethereal: {
    name: "EFFECT.DND5E.StatusEthereal",
    img: "systems/dnd5e/icons/svg/statuses/ethereal.svg",
    neverBlockMovement: true
  },
  flying: {
    name: "EFFECT.DND5E.StatusFlying",
    img: "systems/dnd5e/icons/svg/statuses/flying.svg",
    special: "FLY"
  },
  hiding: {
    name: "EFFECT.DND5E.StatusHiding",
    img: "systems/dnd5e/icons/svg/statuses/hiding.svg"
  },
  hovering: {
    name: "EFFECT.DND5E.StatusHovering",
    img: "systems/dnd5e/icons/svg/statuses/hovering.svg",
    special: "HOVER"
  },
  marked: {
    name: "EFFECT.DND5E.StatusMarked",
    img: "systems/dnd5e/icons/svg/statuses/marked.svg"
  },
  sleeping: {
    name: "EFFECT.DND5E.StatusSleeping",
    img: "systems/dnd5e/icons/svg/statuses/sleeping.svg",
    statuses: ["incapacitated", "unconscious"]
  },
  stable: {
    name: "EFFECT.DND5E.StatusStable",
    img: "systems/dnd5e/icons/svg/statuses/stable.svg"
  }
};

/* -------------------------------------------- */

/**
 * Status effects that never block token movement. Populated during the setup process.
 * @type {Set<string>}
 */
DND5E.neverBlockStatuses = new Set();

/* -------------------------------------------- */

/**
 * Configuration for the special bloodied status effect.
 * @type {{ name: string, icon: string, threshold: number }}
 */
DND5E.bloodied = {
  name: "EFFECT.DND5E.StatusBloodied",
  img: "systems/dnd5e/icons/svg/statuses/bloodied.svg",
  threshold: .5
};

/* -------------------------------------------- */
/*  Languages                                   */
/* -------------------------------------------- */

/**
 * Languages a character can learn.
 * @enum {object}
 */
DND5E.languages = {
  standard: {
    label: "DND5E.Language.Category.Standard",
    selectable: false,
    children: {
      common: "DND5E.Language.Language.Common",
      draconic: "DND5E.Language.Language.Draconic",
      dwarvish: "DND5E.Language.Language.Dwarvish",
      elvish: "DND5E.Language.Language.Elvish",
      giant: "DND5E.Language.Language.Giant",
      gnomish: "DND5E.Language.Language.Gnomish",
      goblin: "DND5E.Language.Language.Goblin",
      halfling: "DND5E.Language.Language.Halfling",
      orc: "DND5E.Language.Language.Orc",
      sign: "DND5E.Language.Language.CommonSign"
    }
  },
  exotic: {
    label: "DND5E.Language.Category.Rare",
    selectable: false,
    children: {
      aarakocra: "DND5E.Language.Language.Aarakocra",
      abyssal: "DND5E.Language.Language.Abyssal",
      cant: "DND5E.Language.Language.ThievesCant",
      celestial: "DND5E.Language.Language.Celestial",
      deep: "DND5E.Language.Language.DeepSpeech",
      druidic: "DND5E.Language.Language.Druidic",
      gith: "DND5E.Language.Language.Gith",
      gnoll: "DND5E.Language.Language.Gnoll",
      infernal: "DND5E.Language.Language.Infernal",
      primordial: {
        label: "DND5E.Language.Language.Primordial",
        children: {
          aquan: "DND5E.Language.Language.Aquan",
          auran: "DND5E.Language.Language.Auran",
          ignan: "DND5E.Language.Language.Ignan",
          terran: "DND5E.Language.Language.Terran"
        }
      },
      sylvan: "DND5E.Language.Language.Sylvan",
      undercommon: "DND5E.Language.Language.Undercommon"
    }
  }
};
preLocalize("languages", { key: "label" });
preLocalize("languages.standard.children", { key: "label", sort: true });
preLocalize("languages.exotic.children", { key: "label", sort: true });
preLocalize("languages.exotic.children.primordial.children", { sort: true });

/* -------------------------------------------- */

/**
 * Communication types that take ranges such as telepathy.
 * @enum {{ label: string }}
 */
DND5E.communicationTypes = {
  telepathy: {
    label: "DND5E.Language.Communication.Telepathy"
  }
};
preLocalize("communicationTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * @typedef HabitatConfiguration5e
 * @property {string} label        The human-readable habitat name.
 * @property {boolean} [subtypes]  Whether this habitat is divided into sub-types.
 */

/**
 * NPC habitats.
 * @type {Record<string, HabitatConfiguration5e>}
 */
DND5E.habitats = {
  any: {
    label: "DND5E.Habitat.Categories.Any"
  },
  arctic: {
    label: "DND5E.Habitat.Categories.Arctic"
  },
  coastal: {
    label: "DND5E.Habitat.Categories.Coastal"
  },
  desert: {
    label: "DND5E.Habitat.Categories.Desert"
  },
  forest: {
    label: "DND5E.Habitat.Categories.Forest"
  },
  grassland: {
    label: "DND5E.Habitat.Categories.Grassland"
  },
  hill: {
    label: "DND5E.Habitat.Categories.Hill"
  },
  mountain: {
    label: "DND5E.Habitat.Categories.Mountain"
  },
  planar: {
    label: "DND5E.Habitat.Categories.Planar",
    subtypes: true
  },
  swamp: {
    label: "DND5E.Habitat.Categories.Swamp"
  },
  underdark: {
    label: "DND5E.Habitat.Categories.Underdark"
  },
  underwater: {
    label: "DND5E.Habitat.Categories.Underwater"
  },
  urban: {
    label: "DND5E.Habitat.Categories.Urban"
  }
};
preLocalize("habitats", { key: "label" });

/* -------------------------------------------- */

/**
 * @typedef TreasureConfiguration5e
 * @property {string} label  The human-readable treasure category name.
 */

/**
 * NPC Treasure
 * @type {Record<string, TreasureConfiguration5e>}
 */
DND5E.treasure = {
  any: {
    label: "DND5E.Treasure.Categories.Any"
  },
  arcana: {
    label: "DND5E.Treasure.Categories.Arcana"
  },
  armaments: {
    label: "DND5E.Treasure.Categories.Armaments"
  },
  implements: {
    label: "DND5E.Treasure.Categories.Implements"
  },
  individual: {
    label: "DND5E.Treasure.Categories.Individual"
  },
  relics: {
    label: "DND5E.Treasure.Categories.Relics"
  }
};
preLocalize("treasure", { key: "label" });

/* -------------------------------------------- */

/**
 * Maximum allowed character level.
 * @type {number}
 */
DND5E.maxLevel = 20;

/**
 * Maximum ability score value allowed by default.
 * @type {number}
 */
DND5E.maxAbilityScore = 20;

/**
 * XP required to achieve each character level.
 * @type {number[]}
 */
DND5E.CHARACTER_EXP_LEVELS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/**
 * XP granted for each challenge rating.
 * @type {number[]}
 */
DND5E.CR_EXP_LEVELS = [
  10, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000,
  20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000, 120000, 135000, 155000
];

/**
 * XP thresholds for encounter difficulty.
 * @type {number[][]}
 */
DND5E.ENCOUNTER_DIFFICULTY = [
  [0, 0, 0],
  [50, 75, 100],
  [100, 150, 200],
  [150, 225, 400],
  [250, 375, 500],
  [500, 750, 1100],
  [600, 1000, 1400],
  [750, 1300, 1700],
  [1000, 1700, 2100],
  [1300, 2000, 2600],
  [1600, 2300, 3100],
  [1900, 2900, 4100],
  [2200, 3700, 4700],
  [2600, 4200, 5400],
  [2900, 4900, 6200],
  [3300, 5400, 7800],
  [3800, 6100, 9800],
  [4500, 7200, 11700],
  [5000, 8700, 14200],
  [5500, 10700, 17200],
  [6400, 13200, 22000]
];

/**
 * Intervals above the maximum XP that result in an epic boon.
 * @type {number}
 */
DND5E.epicBoonInterval = 30000;

/* -------------------------------------------- */

/**
 * Trait configuration information.
 *
 * @typedef {object} TraitConfiguration
 * @property {object} labels
 * @property {string} labels.title         Localization key for the trait name.
 * @property {string} labels.localization  Prefix for a localization key that can be used to generate various
 *                                         plural variants of the trait type.
 * @property {string} [labels.all]         Localization to use for the "all" option for this trait. If not provided,
 *                                         then no all option will be available.
 * @property {string} icon                 Path to the icon used to represent this trait.
 * @property {string} [actorKeyPath]       If the trait doesn't directly map to an entry as `traits.[key]`, where is
 *                                         this trait's data stored on the actor?
 * @property {string} [configKey]          If the list of trait options doesn't match the name of the trait, where can
 *                                         the options be found within `CONFIG.DND5E`?
 * @property {boolean|number} [dataType]   Type of data represented.
 * @property {string} [labelKeyPath]       If config is an enum of objects, where can the label be found?
 * @property {object} [subtypes]           Configuration for traits that take some sort of base item.
 * @property {string} [subtypes.keyPath]   Path to subtype value on base items, should match a category key.
 *                                         Deprecated in favor of the standardized `system.type.value`.
 * @property {string[]} [subtypes.ids]     Key for base item ID objects within `CONFIG.DND5E`.
 * @property {object} [children]           Mapping of category key to an object defining its children.
 * @property {boolean} [sortCategories]    Whether top-level categories should be sorted.
 * @property {boolean} [expertise]         Can an actor receive expertise in this trait?
 * @property {boolean} [mastery]           Can an actor receive mastery in this trait?
 */

/**
 * Configurable traits on actors.
 * @enum {TraitConfiguration}
 */
DND5E.traits = {
  saves: {
    labels: {
      title: "DND5E.ClassSaves",
      localization: "DND5E.TraitSavesPlural"
    },
    icon: "icons/magic/life/ankh-gold-blue.webp",
    actorKeyPath: "system.abilities",
    configKey: "abilities",
    labelKeyPath: "label"
  },
  skills: {
    labels: {
      title: "DND5E.Skills",
      localization: "DND5E.TraitSkillsPlural"
    },
    icon: "icons/tools/instruments/harp-yellow-teal.webp",
    actorKeyPath: "system.skills",
    labelKeyPath: "label",
    expertise: true,
    dataType: MappingField
  },
  languages: {
    labels: {
      title: "DND5E.Languages",
      localization: "DND5E.TraitLanguagesPlural",
      all: "DND5E.Language.All"
    },
    icon: "icons/skills/social/diplomacy-peace-alliance.webp"
  },
  armor: {
    labels: {
      title: "DND5E.TraitArmorProf",
      localization: "DND5E.TraitArmorPlural"
    },
    icon: "icons/equipment/chest/breastplate-helmet-metal.webp",
    actorKeyPath: "system.traits.armorProf",
    configKey: "armorProficiencies",
    subtypes: { keyPath: "armor.type", ids: ["armorIds", "shieldIds"] }
  },
  weapon: {
    labels: {
      title: "DND5E.TraitWeaponProf",
      localization: "DND5E.TraitWeaponPlural"
    },
    icon: "icons/skills/melee/weapons-crossed-swords-purple.webp",
    actorKeyPath: "system.traits.weaponProf",
    configKey: "weaponProficiencies",
    subtypes: { keyPath: "weaponType", ids: ["weaponIds"] },
    mastery: true
  },
  tool: {
    labels: {
      title: "DND5E.TraitToolProf",
      localization: "DND5E.TraitToolPlural"
    },
    icon: "icons/skills/trades/smithing-anvil-silver-red.webp",
    actorKeyPath: "system.tools",
    configKey: "toolProficiencies",
    subtypes: { keyPath: "toolType", ids: ["tools"] },
    children: { vehicle: "vehicleTypes" },
    sortCategories: true,
    expertise: true,
    dataType: MappingField
  },
  di: {
    labels: {
      title: "DND5E.DamImm",
      localization: "DND5E.TraitDIPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-damage-immunities.svg",
    configKey: "damageTypes"
  },
  dr: {
    labels: {
      title: "DND5E.DamRes",
      localization: "DND5E.TraitDRPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-damage-resistances.svg",
    configKey: "damageTypes"
  },
  dv: {
    labels: {
      title: "DND5E.DamVuln",
      localization: "DND5E.TraitDVPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-damage-vulnerabilities.svg",
    configKey: "damageTypes"
  },
  dm: {
    labels: {
      title: "DND5E.DamMod",
      localization: "DND5E.TraitDMPlural"
    },
    configKey: "damageTypes",
    dataType: Number
  },
  ci: {
    labels: {
      title: "DND5E.ConImm",
      localization: "DND5E.TraitCIPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-condition-immunities.svg",
    configKey: "conditionTypes",
    labelKeyPath: "name"
  }
};
preLocalize("traits", { keys: ["labels.title", "labels.all"] });

/* -------------------------------------------- */

/**
 * Modes used within a trait advancement.
 * @enum {object}
 */
DND5E.traitModes = {
  default: {
    label: "DND5E.ADVANCEMENT.Trait.Mode.Default.Label",
    hint: "DND5E.ADVANCEMENT.Trait.Mode.Default.Hint"
  },
  expertise: {
    label: "DND5E.ADVANCEMENT.Trait.Mode.Expertise.Label",
    hint: "DND5E.ADVANCEMENT.Trait.Mode.Expertise.Hint"
  },
  forcedExpertise: {
    label: "DND5E.ADVANCEMENT.Trait.Mode.Force.Label",
    hint: "DND5E.ADVANCEMENT.Trait.Mode.Force.Hint"
  },
  upgrade: {
    label: "DND5E.ADVANCEMENT.Trait.Mode.Upgrade.Label",
    hint: "DND5E.ADVANCEMENT.Trait.Mode.Upgrade.Hint"
  },
  mastery: {
    label: "DND5E.ADVANCEMENT.Trait.Mode.Mastery.Label",
    hint: "DND5E.ADVANCEMENT.Trait.Mode.Mastery.Hint"
  }
};
preLocalize("traitModes", { keys: ["label", "hint"] });

/* -------------------------------------------- */

/**
 * @typedef {object} CharacterFlagConfig
 * @property {string} name
 * @property {string} hint
 * @property {string} section
 * @property {typeof boolean|string|number} type
 * @property {string} placeholder
 * @property {string[]} [abilities]
 * @property {Object<string, string>} [choices]
 * @property {boolean} [deprecated]               Hide the flag unless it already has a value.
 * @property {string[]} [skills]
 */

/**
 * Special character flags.
 * @enum {CharacterFlagConfig}
 */
DND5E.characterFlags = {
  diamondSoul: {
    name: "DND5E.FlagsDiamondSoul",
    hint: "DND5E.FlagsDiamondSoulHint",
    section: "DND5E.Feats",
    type: Boolean
  },
  enhancedDualWielding: {
    name: "DND5E.FLAGS.EnhancedDualWielding.Name",
    hint: "DND5E.FLAGS.EnhancedDualWielding.Hint",
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
  halflingNimbleness: {
    name: "DND5E.FlagsHalflingNimbleness",
    hint: "DND5E.FlagsHalflingNimblenessHint",
    section: "DND5E.RacialTraits",
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
  tavernBrawlerFeat: {
    name: "DND5E.FlagsTavernBrawler",
    hint: "DND5E.FlagsTavernBrawlerHint",
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
  toolExpertise: {
    name: "DND5E.FlagsToolExpertise",
    hint: "DND5E.FlagsToolExpertiseHint",
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
 * Different types of actor structures that groups can represent.
 * @enum {object}
 */
DND5E.groupTypes = {
  party: "DND5E.Group.TypeParty",
  encounter: "DND5E.Group.TypeEncounter"
};
preLocalize("groupTypes");

/* -------------------------------------------- */

/**
 * Configuration information for activity types.
 *
 * @typedef {object} ActivityTypeConfiguration
 * @property {typeof Activity} documentClass  The activity's document class.
 * @property {boolean} [configurable=true]    Whether the activity is editable via the UI.
 * @property {boolean} [hidden]               Should this activity type be hidden in the selection dialog?
 */
DND5E.activityTypes = {
  attack: {
    documentClass: activities.AttackActivity
  },
  cast: {
    documentClass: activities.CastActivity
  },
  check: {
    documentClass: activities.CheckActivity
  },
  damage: {
    documentClass: activities.DamageActivity
  },
  enchant: {
    documentClass: activities.EnchantActivity
  },
  forward: {
    documentClass: activities.ForwardActivity
  },
  heal: {
    documentClass: activities.HealActivity
  },
  order: {
    documentClass: activities.OrderActivity,
    configurable: false
  },
  save: {
    documentClass: activities.SaveActivity
  },
  summon: {
    documentClass: activities.SummonActivity
  },
  transform: {
    documentClass: activities.TransformActivity
  },
  utility: {
    documentClass: activities.UtilityActivity
  }
};

/* -------------------------------------------- */

/**
 * Configuration information for advancement types.
 *
 * @typedef {object} AdvancementTypeConfiguration
 * @property {typeof Advancement} documentClass  The advancement's document class.
 * @property {Set<string>} validItemTypes        What item types this advancement can be used with.
 * @property {boolean} [hidden]                  Should this advancement type be hidden in the selection dialog?
 */

const _ALL_ITEM_TYPES = ["background", "class", "feat", "race", "subclass"];

/**
 * Advancement types that can be added to items.
 * @enum {AdvancementTypeConfiguration}
 */
DND5E.advancementTypes = {
  AbilityScoreImprovement: {
    documentClass: advancement.AbilityScoreImprovementAdvancement,
    validItemTypes: new Set(["background", "class", "race", "feat"])
  },
  HitPoints: {
    documentClass: advancement.HitPointsAdvancement,
    validItemTypes: new Set(["class"])
  },
  ItemChoice: {
    documentClass: advancement.ItemChoiceAdvancement,
    validItemTypes: new Set(_ALL_ITEM_TYPES)
  },
  ItemGrant: {
    documentClass: advancement.ItemGrantAdvancement,
    validItemTypes: new Set(_ALL_ITEM_TYPES)
  },
  ScaleValue: {
    documentClass: advancement.ScaleValueAdvancement,
    validItemTypes: new Set(_ALL_ITEM_TYPES)
  },
  Size: {
    documentClass: advancement.SizeAdvancement,
    validItemTypes: new Set(["race"])
  },
  Subclass: {
    documentClass: advancement.SubclassAdvancement,
    validItemTypes: new Set(["class"])
  },
  Trait: {
    documentClass: advancement.TraitAdvancement,
    validItemTypes: new Set(_ALL_ITEM_TYPES)
  }
};

/* -------------------------------------------- */

/**
 * Default artwork configuration for each Document type and sub-type.
 * @type {Record<string, Record<string, string>>}
 */
DND5E.defaultArtwork = {
  Item: {
    background: "systems/dnd5e/icons/svg/items/background.svg",
    class: "systems/dnd5e/icons/svg/items/class.svg",
    consumable: "systems/dnd5e/icons/svg/items/consumable.svg",
    container: "systems/dnd5e/icons/svg/items/container.svg",
    equipment: "systems/dnd5e/icons/svg/items/equipment.svg",
    facility: "systems/dnd5e/icons/svg/items/facility.svg",
    feat: "systems/dnd5e/icons/svg/items/feature.svg",
    loot: "systems/dnd5e/icons/svg/items/loot.svg",
    race: "systems/dnd5e/icons/svg/items/race.svg",
    spell: "systems/dnd5e/icons/svg/items/spell.svg",
    subclass: "systems/dnd5e/icons/svg/items/subclass.svg",
    tool: "systems/dnd5e/icons/svg/items/tool.svg",
    weapon: "systems/dnd5e/icons/svg/items/weapon.svg"
  }
};

/* -------------------------------------------- */
/*  Requests                                    */
/* -------------------------------------------- */

/**
 * @callback RequestCallback5e
 * @param {Actor5e} actor               The actor fulfilling the request.
 * @param {ChatMessage5e} request       The request message.
 * @param {object} config               Additional request configuration.
 * @param {RequestOptions5e} [options]  Additional options provided at fulfillment time.
 * @returns {Promise<ChatMessage5e>}    Result chat message that will be associated with request.
 */

/**
 * @typedef RequestOptions5e
 * @property {Event} [event]  The event forwarded from the user clicking the request button.
 */

/**
 * Handler functions for named request/response operations
 * @type {Record<string, RequestCallback5e>}
 */
DND5E.requests = {
  rest: Actor5e.handleRestRequest,
  skill: Actor5e.handleSkillCheckRequest
};

/* -------------------------------------------- */
/*  Rules                                       */
/* -------------------------------------------- */

/**
 * Configuration information for rule types.
 *
 * @typedef {object} RuleTypeConfiguration
 * @property {string} label         Localized label for the rule type.
 * @property {string} [references]  Key path for a configuration object that contains reference data.
 */

/**
 * Types of rules that can be used in rule pages and the &Reference enricher.
 * @enum {RuleTypeConfiguration}
 */
DND5E.ruleTypes = {
  rule: {
    label: "DND5E.Rule.Type.Rule",
    references: "rules"
  },
  ability: {
    label: "DND5E.Ability",
    references: "enrichmentLookup.abilities"
  },
  areaOfEffect: {
    label: "DND5E.AreaOfEffect.Label",
    references: "areaTargetTypes"
  },
  condition: {
    label: "DND5E.Rule.Type.Condition",
    references: "conditionTypes"
  },
  creatureType: {
    label: "DND5E.CreatureType",
    references: "creatureTypes"
  },
  damage: {
    label: "DND5E.DamageType",
    references: "damageTypes"
  },
  skill: {
    label: "DND5E.Skill",
    references: "enrichmentLookup.skills"
  },
  spellComponent: {
    label: "DND5E.SpellComponent",
    references: "itemProperties"
  },
  spellSchool: {
    label: "DND5E.SpellSchool",
    references: "enrichmentLookup.spellSchools"
  },
  spellTag: {
    label: "DND5E.SpellTag",
    references: "itemProperties"
  },
  weaponMastery: {
    label: "DND5E.WEAPON.Mastery.Label",
    references: "weaponMasteries"
  }
};
preLocalize("ruleTypes", { key: "label" });

/* -------------------------------------------- */

/**
 * List of rules that can be referenced from enrichers.
 * @enum {string}
 */
DND5E.rules = {
  inspiration: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.nkEPI89CiQnOaLYh",
  carryingcapacity: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.1PnjDBKbQJIVyc2t",
  push: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Hni8DjqLzoqsVjb6",
  lift: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Hni8DjqLzoqsVjb6",
  drag: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Hni8DjqLzoqsVjb6",
  encumbrance: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.JwqYf9qb6gJAWZKs",
  hiding: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.plHuoNdS0j3umPNS",
  passiveperception: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.988C2hQNyvqkdbND",
  time: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.eihqNjwpZ3HM4IqY",
  speed: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.HhqeIiSj8sE1v1qZ",
  travelpace: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.eFAISahBloR2X8MX",
  forcedmarch: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.uQWQpRKQ1kWhuvjZ",
  difficultterrainpace: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hFW5BR2yHHwwgurD",
  climbing: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.KxUXbMrUCIAhv4AF",
  swimming: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.KxUXbMrUCIAhv4AF",
  longjump: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.1U0myNrOvIVBUdJV",
  highjump: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.raPwIkqKSv60ELmy",
  falling: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kREHL5pgNUOhay9f",
  suffocating: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.BIlnr0xYhqt4TGsi",
  vision: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.O6hamUbI9kVASN8b",
  light: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.O6hamUbI9kVASN8b",
  lightlyobscured: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.MAxtfJyvJV7EpzWN",
  heavilyobscured: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.wPFjfRruboxhtL4b",
  brightlight: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.RnMokVPyKGbbL8vi",
  dimlight: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.n1Ocpbyhr6HhgbCG",
  darkness: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4dfREIDjG5N4fvxd",
  blindsight: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.sacjsfm9ZXnw4Tqc",
  darkvision: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ldmA1PbnEGVkmE11",
  tremorsense: "Compendium.dnd5e.rules.JournalEntry.eVtpEGXjA2tamEIJ.JournalEntryPage.8AIlZ95v54mL531X",
  truesight: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kNa8rJFbtaTM3Rmk",
  food: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.jayo7XVgGnRCpTW0",
  water: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.iIEI87J7lr2sqtb5",
  resting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.dpHJXYLigIdEseIb",
  shortrest: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.1s2swI3UsjUUgbt2",
  longrest: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.6cLtjbHn4KV2R7G9",
  surprise: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.YmOt8HderKveA19K",
  initiative: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.RcwElV4GAcVXKWxo",
  bonusaction: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.2fu2CXsDg8gQmGGw",
  reaction: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.2VqLyxMyMxgXe2wC",
  difficultterrain: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.6tqz947qO8vPyxvD",
  beingprone: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.bV8akkBdVUUG21CO",
  droppingprone: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hwTLpAtSS5OqQsI1",
  standingup: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hwTLpAtSS5OqQsI1",
  crawling: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.VWG9qe8PUNtS28Pw",
  movingaroundothercreatures: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.9ZWCknaXCOdhyOrX",
  flying: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.0B1fxfmw0a48tPsc",
  size: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.HWHRQVBVG7K0RVVW",
  space: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.WIA5bs3P45PmO3OS",
  squeezing: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.wKtOwagDAiNfVoPS",
  attack: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.f4fZHwBvpbpzRyn4",
  castaspell: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.GLwN36E4WXn3Cp4Z",
  dash: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.6l6nBKip4LqB1sCU",
  disengage: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.w1AGsemFERfjqWNx",
  dodge: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.3YJIuyCMmuUrfmuX",
  help: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.5S8i59qskkd9GGcJ",
  hide: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.rqhOsUY4wWa1oHTy",
  ready: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.nI9tN6Oq7fCV7hcA",
  search: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.ySj4gYZ4ADZoia7R",
  useanobject: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ljqhJx8Qxu2ivo69",
  attackrolls: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.W8uJrd1D8NeOuawp",
  unseenattackers: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.5ZJNwEPlsGurecg5",
  unseentargets: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.5ZJNwEPlsGurecg5",
  rangedattacks: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.S9aclVOCbusLE3kC",
  range: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.HjKXuB8ndjcqOds7",
  rangedattacksinclosecombat: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.qEZvxW0NM7ixSQP5",
  meleeattacks: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.GTk6emvzNxl8Oosl",
  reach: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hgZ5ZN4B3y7tmFlt",
  unarmedstrike: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.xJjJ4lhymAYXAOvO",
  opportunityattacks: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.zeU0NyCyP10lkLg3",
  twoweaponfighting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.FQTS08uH74A6psL2",
  grappling: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.YSLWJcQCP6kzsPql",
  escapingagrapple: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.2TZKy9YbMN3ZY3h8",
  movingagrappledcreature: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.x5bUdhAD7u5Bt2rg",
  shoving: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hrdqMF8hRXJdNzJx",
  cover: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.W7f7PcRubNUMIq2S",
  halfcover: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hv0J61IAfofuhy3Q",
  threequarterscover: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.zAMStUjUrPV10dFm",
  totalcover: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.BKUAxXuPEzxiEOeL",
  hitpoints: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.PFbzoMBviI2DD9QP",
  damagerolls: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.hd26AqKrCqtcQBWy",
  criticalhits: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.gFL1VhSEljL1zvje",
  damagetypes: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.jVOgf7DNEhkzYNIe",
  damageresistance: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.v0WE18nT5SJO8Ft7",
  damagevulnerability: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.v0WE18nT5SJO8Ft7",
  healing: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ICketFqbFslqKiX9",
  instantdeath: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.8BG05mA0mEzwmrHU",
  deathsavingthrows: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.JL8LePEJQYFdNuLL",
  deathsaves: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.JL8LePEJQYFdNuLL",
  stabilizing: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.r1CgZXLcqFop6Dlx",
  knockingacreatureout: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.uEwjgKGuCRTNADYv",
  temporaryhitpoints: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.AW6HpJZHqxfESXaq",
  temphp: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.AW6HpJZHqxfESXaq",
  mounting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.MFpyvUIdcBpC9kIE",
  dismounting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.MFpyvUIdcBpC9kIE",
  controllingamount: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.khmR2xFk1NxoQUgZ",
  underwatercombat: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.6zVOeLyq4iMnrQT4",
  spelllevel: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.A6k5fS0kFqPXTW3v",
  knownspells: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.oezg742GlxmEwT85",
  preparedspells: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.oezg742GlxmEwT85",
  spellslots: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Su6wbb0O9UN4ZDIH",
  castingatahigherlevel: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4H9SLM95OCLfFizz",
  upcasting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.4H9SLM95OCLfFizz",
  castinginarmor: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.z4A8vHSK2pb8YA9X",
  cantrips: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.jZD5mCTnMPJ9jW67",
  rituals: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.FjWqT5iyJ89kohdA",
  castingtime: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.zRVW8Tvyk6BECjZD",
  bonusactioncasting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.RP1WL9FXI3aknlxZ",
  reactioncasting: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.t62lCfinwU9H7Lji",
  longercastingtimes: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.gOAIRFCyPUx42axn",
  spellrange: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.RBYPyE5z5hAZSbH6",
  components: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.xeHthAF9lxfn2tII",
  verbal: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.6UXTNWMCQ0nSlwwx",
  spellduration: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.9mp0SRsptjvJcq1e",
  instantaneous: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kdlgZOpRMB6bGCod",
  concentrating: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.ow58p27ctAnr4VPH",
  spelltargets: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.G80AIQr04sxdVpw4",
  areaofeffect: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.wvtCeGHgnUmh0cuj",
  pointoforigin: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.8HxbRceQQUAhyWRt",
  spellsavingthrows: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.8DajfNll90eeKcmB",
  spellattackrolls: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.qAFzmGZKhVvAEUF3",
  combiningmagicaleffects: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.TMIN963hG773yZzO",
  schoolsofmagic: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.TeF6CKMDRpYpsLd4",
  detectingtraps: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.DZ7AhdQ94xggG4bj",
  disablingtraps: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.DZ7AhdQ94xggG4bj",
  curingmadness: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.6Icem7G3CICdNOkM",
  damagethreshold: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.9LJZhqvCburpags3",
  poisontypes: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.I6OMMWUaYCWR9xip",
  contactpoison: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.kXnCEqqGUWRZeZDj",
  ingestedpoison: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.Y0vsJYSWeQcFpJ27",
  inhaledpoison: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.KUyN4eK1xTBzXsjP",
  injurypoison: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.LUL48OUq6SJeMGc7",
  attunement: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.UQ65OwIyGK65eiOK",
  wearingitems: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.iPB8mGKuQx3X0Z2J",
  wieldingitems: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.iPB8mGKuQx3X0Z2J",
  multipleitemsofthesamekind: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.rLJdvz4Mde8GkEYQ",
  paireditems: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.rd9pCH8yFraSGN34",
  commandword: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.HiXixxLYesv6Ff3t",
  consumables: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.UEPAcZFzQ5x196zE",
  itemspells: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.DABoaeeF6w31UCsj",
  charges: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.NLRXcgrpRCfsA5mO",
  spellscroll: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.gi8IKhtOlBVhMJrN",
  creaturetags: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.9jV1fFF163dr68vd",
  telepathy: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.geTidcFIYWuUvD2L",
  legendaryactions: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.C1awOyZh78pq1xmY",
  lairactions: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.07PtjpMxiRIhkBEp",
  regionaleffects: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.uj8W27NKFyzygPUd",
  disease: "Compendium.dnd5e.content24.JournalEntry.phbAppendixDRule.JournalEntryPage.oNQWvyRZkTOJ8PBq",
  d20test: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.nxPH59t3iNtWJxnU",
  advantage: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.lvs9RRDi1UA1Lff8",
  disadvantage: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.fFrHBgqKUMY0Nnco",
  difficultyclass: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.afnB0KZZk2hKtjv4",
  armorclass: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.IL73rq9BlQowdon7",
  abilitycheck: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.XBQqXCoTbvp5Dika",
  savingthrow: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.Vlri6Mp6grn9wt3g",
  challengerating: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.BMoxmXB8pX6bOBus",
  expertise: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.69nu4Sk3V5O15GFf",
  influence: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.4V59Q1dlWjNhpJGo",
  magic: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.iIIDUsmSOkL0xNzF",
  study: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.Nuz0Wx4a4aAPcC34",
  utilize: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.UDlogfdiT2uYEZz4",
  friendly: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.RVcWSqblHIs7SUzn",
  indifferent: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.eYX5eimGuYhHPoj4",
  hostile: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.BNxLbtJofbNGzjsp",
  breakingobjects: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.RXTLVpAwcGm1qtKf",
  hazards: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.5hyEitPd1Kb27fP5",
  bloodied: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.shZaSIlFPpHufPFn",
  jumping: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.aaJOlRhI1H6vAxt9",
  resistance: "Compendium.dnd5e.content24.JournalEntry.phbAppendixCRule.JournalEntryPage.Uk3xhCTvEfx8BN1O"
};

/* -------------------------------------------- */
/*  Token Rings Framework                       */
/* -------------------------------------------- */

/**
 * Token Rings configuration data
 *
 * @typedef {object} TokenRingsConfiguration
 * @property {Record<string, string>} effects        Localized names of the configurable ring effects.
 * @property {string} spriteSheet                    The sprite sheet json source.
 * @property {typeof BaseSamplerShader} shaderClass  The shader class definition associated with the token ring.
 */

/**
 * @type {TokenRingsConfiguration}
 */
DND5E.tokenRings = {
  effects: {
    RING_PULSE: "DND5E.TokenRings.Effects.RingPulse",
    RING_GRADIENT: "DND5E.TokenRings.Effects.RingGradient",
    BKG_WAVE: "DND5E.TokenRings.Effects.BackgroundWave"
  },
  spriteSheet: "systems/dnd5e/tokens/composite/token-rings.json",
  shaderClass: null
};
preLocalize("tokenRings.effects");

/* -------------------------------------------- */
/*  Sources                                     */
/* -------------------------------------------- */

/**
 * List of books available as sources.
 * @enum {string}
 */
DND5E.sourceBooks = {};
preLocalize("sourceBooks", { sort: true });

/* -------------------------------------------- */
/*  Themes                                      */
/* -------------------------------------------- */

/**
 * Themes that can be set for the system or on sheets.
 * @enum {string}
 */
DND5E.themes = {
  light: "SHEETS.DND5E.THEME.Light",
  dark: "SHEETS.DND5E.THEME.Dark"
};
preLocalize("themes");

/* -------------------------------------------- */
/*  Enrichment                                  */
/* -------------------------------------------- */

let _enrichmentLookup;
Object.defineProperty(DND5E, "enrichmentLookup", {
  get() {
    const slugify = value => value?.slugify().replaceAll("-", "");
    if ( !_enrichmentLookup ) {
      _enrichmentLookup = {
        abilities: foundry.utils.deepClone(DND5E.abilities),
        skills: foundry.utils.deepClone(DND5E.skills),
        spellSchools: foundry.utils.deepClone(DND5E.spellSchools),
        tools: foundry.utils.deepClone(DND5E.tools)
      };
      const addFullKeys = key => Object.entries(DND5E[key]).forEach(([k, v]) =>
        _enrichmentLookup[key][slugify(v.fullKey)] = { ...v, key: k }
      );
      addFullKeys("abilities");
      addFullKeys("skills");
      addFullKeys("spellSchools");
    }
    return _enrichmentLookup;
  },
  enumerable: true
});

/* -------------------------------------------- */

/**
 * Patch an existing config enum to allow conversion from string values to object values without
 * breaking existing modules that are expecting strings.
 * @param {string} key          Key within DND5E that has been replaced with an enum of objects.
 * @param {string} fallbackKey  Key within the new config object from which to get the fallback value.
 * @param {object} [options]    Additional options passed through to logCompatibilityWarning.
 */
function patchConfig(key, fallbackKey, options) {
  /** @override */
  function toString() {
    const message = `The value of CONFIG.DND5E.${key} has been changed to an object.`
      +` The former value can be acccessed from .${fallbackKey}.`;
    foundry.utils.logCompatibilityWarning(message, options);
    return this[fallbackKey];
  }

  Object.values(DND5E[key]).forEach(o => {
    if ( foundry.utils.getType(o) !== "Object" ) return;
    Object.defineProperty(o, "toString", {value: toString});
  });
}

/* -------------------------------------------- */

export default DND5E;
