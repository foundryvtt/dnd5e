import MapLocationControlIcon from "./canvas/map-location-control-icon.mjs";
import { ConsumptionTargetData } from "./data/activity/fields/consumption-targets-field.mjs";
import TransformationSetting from "./data/settings/transformation-setting.mjs";
import * as activities from "./documents/activity/_module.mjs";
import * as advancement from "./documents/advancement/_module.mjs";
import { preLocalize } from "./utils.mjs";

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
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.nUPv6C66Ur64BIUH",
    icon: "systems/dnd5e/icons/svg/abilities/strength.svg"
  },
  dex: {
    label: "DND5E.AbilityDex",
    abbreviation: "DND5E.AbilityDexAbbr",
    type: "physical",
    fullKey: "dexterity",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ER8CKDUWLsFXuARJ",
    icon: "systems/dnd5e/icons/svg/abilities/dexterity.svg"
  },
  con: {
    label: "DND5E.AbilityCon",
    abbreviation: "DND5E.AbilityConAbbr",
    type: "physical",
    fullKey: "constitution",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MpA4jnwD17Q0RPg7",
    icon: "systems/dnd5e/icons/svg/abilities/constitution.svg"
  },
  int: {
    label: "DND5E.AbilityInt",
    abbreviation: "DND5E.AbilityIntAbbr",
    type: "mental",
    fullKey: "intelligence",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.WzWWcTIppki35YvF",
    icon: "systems/dnd5e/icons/svg/abilities/intelligence.svg",
    defaults: { vehicle: 0 }
  },
  wis: {
    label: "DND5E.AbilityWis",
    abbreviation: "DND5E.AbilityWisAbbr",
    type: "mental",
    fullKey: "wisdom",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.v3IPyTtqvXqN934s",
    icon: "systems/dnd5e/icons/svg/abilities/wisdom.svg",
    defaults: { vehicle: 0 }
  },
  cha: {
    label: "DND5E.AbilityCha",
    abbreviation: "DND5E.AbilityChaAbbr",
    type: "mental",
    fullKey: "charisma",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9FyghudYFV5QJOuG",
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
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AvvBLEHNl7kuwPkN",
    icon: "icons/equipment/feet/shoes-simple-leaf-green.webp"
  },
  ani: {
    label: "DND5E.SkillAni",
    ability: "wis",
    fullKey: "animalHandling",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.xb3MCjUvopOU4viE",
    icon: "icons/environment/creatures/horse-brown.webp"
  },
  arc: {
    label: "DND5E.SkillArc",
    ability: "int",
    fullKey: "arcana",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.h3bYSPge8IOqne1N",
    icon: "icons/sundries/books/book-embossed-jewel-silver-green.webp"
  },
  ath: {
    label: "DND5E.SkillAth",
    ability: "str",
    fullKey: "athletics",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.rIR7ttYDUpH3tMzv",
    icon: "icons/magic/control/buff-strength-muscle-damage-orange.webp"
  },
  dec: {
    label: "DND5E.SkillDec",
    ability: "cha",
    fullKey: "deception",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.mqVZ2fz0L7a9VeKJ",
    icon: "icons/magic/control/mouth-smile-deception-purple.webp"
  },
  his: {
    label: "DND5E.SkillHis",
    ability: "int",
    fullKey: "history",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kRBZbdWMGW9K3wdY",
    icon: "icons/sundries/books/book-embossed-bound-brown.webp"
  },
  ins: {
    label: "DND5E.SkillIns",
    ability: "wis",
    fullKey: "insight",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8R5SMbAGbECNgO8z",
    icon: "icons/magic/perception/orb-crystal-ball-scrying-blue.webp"
  },
  itm: {
    label: "DND5E.SkillItm",
    ability: "cha",
    fullKey: "intimidation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4VHHI2gJ1jEsppfg",
    icon: "icons/skills/social/intimidation-impressing.webp"
  },
  inv: {
    label: "DND5E.SkillInv",
    ability: "int",
    fullKey: "investigation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Y7nmbQAruWOs7WRM",
    icon: "icons/tools/scribal/magnifying-glass.webp"
  },
  med: {
    label: "DND5E.SkillMed",
    ability: "wis",
    fullKey: "medicine",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.GeYmM7BVfSCAga4o",
    icon: "icons/tools/cooking/mortar-herbs-yellow.webp"
  },
  nat: {
    label: "DND5E.SkillNat",
    ability: "int",
    fullKey: "nature",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ueMx3uF2PQlcye31",
    icon: "icons/magic/nature/plant-sprout-snow-green.webp"
  },
  prc: {
    label: "DND5E.SkillPrc",
    ability: "wis",
    fullKey: "perception",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.zjEeHCUqfuprfzhY",
    icon: "icons/magic/perception/eye-ringed-green.webp"
  },
  prf: {
    label: "DND5E.SkillPrf",
    ability: "cha",
    fullKey: "performance",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hYT7Z06yDNBcMtGe",
    icon: "icons/tools/instruments/lute-gold-brown.webp"
  },
  per: {
    label: "DND5E.SkillPer",
    ability: "cha",
    fullKey: "persuasion",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4R5H8iIsdFQTsj3X",
    icon: "icons/skills/social/diplomacy-handshake.webp"
  },
  rel: {
    label: "DND5E.SkillRel",
    ability: "int",
    fullKey: "religion",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.CXVzERHdP4qLhJXM",
    icon: "icons/magic/holy/saint-glass-portrait-halo.webp"
  },
  slt: {
    label: "DND5E.SkillSlt",
    ability: "dex",
    fullKey: "sleightOfHand",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.yg6SRpGNVz9nDW0A",
    icon: "icons/sundries/gaming/playing-cards.webp"
  },
  ste: {
    label: "DND5E.SkillSte",
    ability: "dex",
    fullKey: "stealth",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4MfrpERNiQXmvgCI",
    icon: "icons/magic/perception/shadow-stealth-eyes-purple.webp"
  },
  sur: {
    label: "DND5E.SkillSur",
    ability: "wis",
    fullKey: "survival",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.t3EzDU5b9BVAIEVi",
    icon: "icons/magic/fire/flame-burning-campfire-yellow-blue.webp"
  }
};
preLocalize("skills", { key: "label", sort: true });

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
    label: "DND5E.WEAPON.Mastery.Cleave"
  },
  graze: {
    label: "DND5E.WEAPON.Mastery.Graze"
  },
  nick: {
    label: "DND5E.WEAPON.Mastery.Nick"
  },
  push: {
    label: "DND5E.WEAPON.Mastery.Push"
  },
  sap: {
    label: "DND5E.WEAPON.Mastery.Sap"
  },
  slow: {
    label: "DND5E.WEAPON.Mastery.Slow"
  },
  topple: {
    label: "DND5E.WEAPON.Mastery.Topple"
  },
  vex: {
    label: "DND5E.WEAPON.Mastery.Vex"
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
  battleaxe: "I0WocDSuNpGJayPb",
  blowgun: "wNWK6yJMHG9ANqQV",
  club: "nfIRTECQIG81CvM4",
  dagger: "0E565kQUBmndJ1a2",
  dart: "3rCO8MTIdPGSW6IJ",
  flail: "UrH3sMdnUDckIHJ6",
  glaive: "rOG1OM2ihgPjOvFW",
  greataxe: "1Lxk6kmoRhG8qQ0u",
  greatclub: "QRCsxkCwWNwswL9o",
  greatsword: "xMkP8BmFzElcsMaR",
  halberd: "DMejWAc8r8YvDPP1",
  handaxe: "eO7Fbv5WBk5zvGOc",
  handcrossbow: "qaSro7kFhxD6INbZ",
  heavycrossbow: "RmP0mYRn2J7K26rX",
  javelin: "DWLMnODrnHn8IbAG",
  lance: "RnuxdHUAIgxccVwj",
  lightcrossbow: "ddWvQRLmnnIS0eLF",
  lighthammer: "XVK6TOL4sGItssAE",
  longbow: "3cymOVja8jXbzrdT",
  longsword: "10ZP2Bu3vnCuYMIB",
  mace: "Ajyq6nGwF7FtLhDQ",
  maul: "DizirD7eqjh8n95A",
  morningstar: "dX8AxCh9o0A9CkT3",
  net: "aEiM49V8vWpWw7rU",
  pike: "tC0kcqZT9HHAO0PD",
  quarterstaff: "g2dWN7PQiMRYWzyk",
  rapier: "Tobce1hexTnDk4sV",
  scimitar: "fbC0Mg1a73wdFbqO",
  shortsword: "osLzOwQdPtrK3rQH",
  sickle: "i4NeNZ30ycwPDHMx",
  spear: "OG4nBBydvmfWYXIk",
  shortbow: "GJv6WkD7D2J6rP6M",
  sling: "3gynWO9sN4OLGMWD",
  trident: "F65ANO66ckP8FDMa",
  warpick: "2YdfjN1PIIrSHZii",
  warhammer: "F0Df164Xv1gWcYt0",
  whip: "QKTyxoO0YDnAsbYe"
};

/* -------------------------------------------- */

/**
 * The basic ammunition types.
 * @enum {string}
 */
DND5E.ammoIds = {
  arrow: "3c7JXOzsv55gqJS5",
  blowgunNeedle: "gBQ8xqTA5f8wP5iu",
  crossbowBolt: "SItCnYBqhzqBoaWG",
  slingBullet: "z9SbsMIBZzuhZOqT"
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
    id: "SztwZhbhZeCqyAes"
  },
  bagpipes: {
    ability: "cha",
    id: "yxHi57T5mmVt0oDr"
  },
  brewer: {
    ability: "int",
    id: "Y9S75go1hLMXUD48"
  },
  calligrapher: {
    ability: "dex",
    id: "jhjo20QoiD5exf09"
  },
  card: {
    ability: "wis",
    id: "YwlHI3BVJapz4a3E"
  },
  carpenter: {
    ability: "str",
    id: "8NS6MSOdXtUqD7Ib"
  },
  cartographer: {
    ability: "wis",
    id: "fC0lFK8P4RuhpfaU"
  },
  chess: {
    ability: "wis",
    id: "23y8FvWKf9YLcnBL"
  },
  cobbler: {
    ability: "dex",
    id: "hM84pZnpCqKfi8XH"
  },
  cook: {
    ability: "wis",
    id: "Gflnp29aEv5Lc1ZM"
  },
  dice: {
    ability: "wis",
    id: "iBuTM09KD9IoM5L8"
  },
  disg: {
    ability: "cha",
    id: "IBhDAr7WkhWPYLVn"
  },
  drum: {
    ability: "cha",
    id: "69Dpr25pf4BjkHKb"
  },
  dulcimer: {
    ability: "cha",
    id: "NtdDkjmpdIMiX7I2"
  },
  flute: {
    ability: "cha",
    id: "eJOrPcAz9EcquyRQ"
  },
  forg: {
    ability: "dex",
    id: "cG3m4YlHfbQlLEOx"
  },
  glassblower: {
    ability: "int",
    id: "rTbVrNcwApnuTz5E"
  },
  herb: {
    ability: "int",
    id: "i89okN7GFTWHsvPy"
  },
  horn: {
    ability: "cha",
    id: "aa9KuBy4dst7WIW9"
  },
  jeweler: {
    ability: "int",
    id: "YfBwELTgPFHmQdHh"
  },
  leatherworker: {
    ability: "dex",
    id: "PUMfwyVUbtyxgYbD"
  },
  lute: {
    ability: "cha",
    id: "qBydtUUIkv520DT7"
  },
  lyre: {
    ability: "cha",
    id: "EwG1EtmbgR3bM68U"
  },
  mason: {
    ability: "str",
    id: "skUih6tBvcBbORzA"
  },
  navg: {
    ability: "wis",
    id: "YHCmjsiXxZ9UdUhU"
  },
  painter: {
    ability: "wis",
    id: "ccm5xlWhx74d6lsK"
  },
  panflute: {
    ability: "cha",
    id: "G5m5gYIx9VAUWC3J"
  },
  pois: {
    ability: "int",
    id: "il2GNi8C0DvGLL9P"
  },
  potter: {
    ability: "int",
    id: "hJS8yEVkqgJjwfWa"
  },
  shawm: {
    ability: "cha",
    id: "G3cqbejJpfB91VhP"
  },
  smith: {
    ability: "str",
    id: "KndVe2insuctjIaj"
  },
  thief: {
    ability: "dex",
    id: "woWZ1sO5IUVGzo58"
  },
  tinker: {
    ability: "dex",
    id: "0d08g1i5WXnNrCNA"
  },
  viol: {
    ability: "cha",
    id: "baoe3U5BfMMMxhCU"
  },
  weaver: {
    ability: "dex",
    id: "ap9prThUB2y9lDyj"
  },
  woodcarver: {
    ability: "dex",
    id: "xKErqkLo4ASYr5EP"
  }
};

/**
 * The basic tool types in 5e. This enables specific tool proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
DND5E.toolIds = new Proxy(DND5E.tools, {
  get(target, prop) {
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.toolIds` is deprecated, use `CONFIG.DND5E.tools` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
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
 * @typedef {ActivityActivationTypeConfig}
 * @property {string} label             Localized label for the activation type.
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
    label: "DND5E.Action",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  bonus: {
    label: "DND5E.BonusAction",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  reaction: {
    label: "DND5E.Reaction",
    group: "DND5E.ACTIVATION.Category.Standard"
  },
  minute: {
    label: "DND5E.TimeMinute",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true
  },
  hour: {
    label: "DND5E.TimeHour",
    group: "DND5E.ACTIVATION.Category.Time",
    scalar: true
  },
  day: {
    label: "DND5E.TimeDay",
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
    label: "DND5E.LegendaryAction.Label",
    group: "DND5E.ACTIVATION.Category.Monster",
    scalar: true
  },
  mythic: {
    label: "DND5E.MythicActionLabel",
    group: "DND5E.ACTIVATION.Category.Monster",
    scalar: true
  },
  lair: {
    label: "DND5E.LAIR.Action.Label",
    group: "DND5E.ACTIVATION.Category.Monster"
  },
  crew: {
    label: "DND5E.VehicleCrewAction",
    group: "DND5E.ACTIVATION.Category.Vehicle",
    scalar: true
  },
  special: {
    label: "DND5E.Special"
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
    capacityMultiplier: 0.5
  },
  sm: {
    label: "DND5E.SizeSmall",
    abbreviation: "DND5E.SizeSmallAbbr",
    hitDie: 6,
    dynamicTokenScale: 0.8
  },
  med: {
    label: "DND5E.SizeMedium",
    abbreviation: "DND5E.SizeMediumAbbr",
    hitDie: 8
  },
  lg: {
    label: "DND5E.SizeLarge",
    abbreviation: "DND5E.SizeLargeAbbr",
    hitDie: 10,
    token: 2,
    capacityMultiplier: 2
  },
  huge: {
    label: "DND5E.SizeHuge",
    abbreviation: "DND5E.SizeHugeAbbr",
    hitDie: 12,
    token: 3,
    capacityMultiplier: 4
  },
  grg: {
    label: "DND5E.SizeGargantuan",
    abbreviation: "DND5E.SizeGargantuanAbbr",
    hitDie: 20,
    token: 4,
    capacityMultiplier: 8
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
  // TODO: Remove with DnD5e 5.0
  charges: {
    label: "DND5E.UsesPeriods.Charges",
    abbreviation: "DND5E.UsesPeriods.ChargesAbbreviation",
    formula: true,
    deprecated: true
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
  breastplate: "SK2HATQ4abKUlV8i",
  chainmail: "rLMflzmxpe8JGTOA",
  chainshirt: "p2zChy24ZJdVqMSH",
  halfplate: "vsgmACFYINloIdPm",
  hide: "n1V07puo0RQxPGuF",
  leather: "WwdpHLXGX5r8uZu5",
  padded: "GtKV1b5uqFQqpEni",
  plate: "OjkIqlW2UpgFcjZa",
  ringmail: "nsXZejlmgalj4he9",
  scalemail: "XmnlF5fgIO3tg6TG",
  splint: "cKpJmsJmU8YaiuqG",
  studded: "TIV3B1vbrVHIhQAm"
};

/**
 * The basic shield in 5e.
 * @enum {string}
 */
DND5E.shieldIds = {
  shield: "sSs3hSzkKBMNBgTs"
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
      crystal: "uXOT4fYbgPY8DGdd",
      orb: "tH5Rn0JVRG1zdmPa",
      rod: "OojyyGfh91iViuMF",
      staff: "BeKIrNIvNHRPQ4t5",
      wand: "KA2P6I48iOWlnboO"
    }
  },
  druidic: {
    label: "DND5E.Focus.Druidic",
    itemIds: {
      mistletoe: "xDK9GQd2iqOGH8Sd",
      totem: "PGL6aaM0wE5h0VN5",
      woodenstaff: "FF1ktpb2YSiyv896",
      yewwand: "t5yP0d7YaKwuKKiH"
    }
  },
  holy: {
    label: "DND5E.Focus.Holy",
    itemIds: {
      amulet: "paqlMjggWkBIAeCe",
      emblem: "laVqttkGMW4B9654",
      reliquary: "gP1URGq3kVIIFHJ7"
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
    label: "DND5E.Item.Property.Adamantine",
    isPhysical: true
  },
  amm: {
    label: "DND5E.Item.Property.Ammunition"
  },
  concentration: {
    label: "DND5E.Item.Property.Concentration",
    abbreviation: "DND5E.ConcentrationAbbr",
    icon: "systems/dnd5e/icons/svg/statuses/concentrating.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ow58p27ctAnr4VPH",
    isTag: true
  },
  fin: {
    label: "DND5E.Item.Property.Finesse"
  },
  fir: {
    label: "DND5E.Item.Property.Firearm"
  },
  foc: {
    label: "DND5E.Item.Property.Focus"
  },
  hvy: {
    label: "DND5E.Item.Property.Heavy"
  },
  lgt: {
    label: "DND5E.Item.Property.Light"
  },
  lod: {
    label: "DND5E.Item.Property.Loading"
  },
  material: {
    label: "DND5E.Item.Property.Material",
    abbreviation: "DND5E.ComponentMaterialAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AeH5eDS4YeM9RETC"
  },
  mgc: {
    label: "DND5E.Item.Property.Magical",
    icon: "systems/dnd5e/icons/svg/properties/magical.svg",
    isPhysical: true
  },
  rch: {
    label: "DND5E.Item.Property.Reach"
  },
  rel: {
    label: "DND5E.Item.Property.Reload"
  },
  ret: {
    label: "DND5E.Item.Property.Returning"
  },
  ritual: {
    label: "DND5E.Item.Property.Ritual",
    abbreviation: "DND5E.RitualAbbr",
    icon: "systems/dnd5e/icons/svg/items/spell.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.FjWqT5iyJ89kohdA",
    isTag: true
  },
  sil: {
    label: "DND5E.Item.Property.Silvered",
    isPhysical: true
  },
  somatic: {
    label: "DND5E.Item.Property.Somatic",
    abbreviation: "DND5E.ComponentSomaticAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.qwUNgUNilEmZkSC9"
  },
  spc: {
    label: "DND5E.Item.Property.Special"
  },
  stealthDisadvantage: {
    label: "DND5E.Item.Property.StealthDisadvantage"
  },
  thr: {
    label: "DND5E.Item.Property.Thrown"
  },
  trait: {
    label: "DND5E.Item.Property.Trait"
  },
  two: {
    label: "DND5E.Item.Property.TwoHanded"
  },
  ver: {
    label: "DND5E.Item.Property.Versatile"
  },
  vocal: {
    label: "DND5E.Item.Property.Verbal",
    abbreviation: "DND5E.ComponentVerbalAbbr",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6UXTNWMCQ0nSlwwx"
  },
  weightlessContents: {
    label: "DND5E.Item.Property.WeightlessContents"
  }
};
preLocalize("itemProperties", { keys: ["label", "abbreviation"], sort: true });

/* -------------------------------------------- */

/**
 * The various properties of an item per item type.
 * @enum {object}
 */
DND5E.validProperties = {
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
/*  Movement                                    */
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

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
DND5E.movementTypes = {
  burrow: "DND5E.MovementBurrow",
  climb: "DND5E.MovementClimb",
  fly: "DND5E.MovementFly",
  swim: "DND5E.MovementSwim",
  walk: "DND5E.MovementWalk"
};
preLocalize("movementTypes", { sort: true });

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
 */

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
DND5E.movementUnits = {
  ft: {
    label: "DND5E.UNITS.DISTANCE.Foot.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Foot.Abbreviation",
    conversion: 1,
    formattingUnit: "foot",
    type: "imperial"
  },
  mi: {
    label: "DND5E.UNITS.DISTANCE.Mile.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Mile.Abbreviation",
    conversion: 5_280,
    formattingUnit: "mile",
    type: "imperial"
  },
  m: {
    label: "DND5E.UNITS.DISTANCE.Meter.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Meter.Abbreviation",
    conversion: 10 / 3, // D&D uses a simplified 5ft -> 1.5m conversion.
    formattingUnit: "meter",
    type: "metric"
  },
  km: {
    label: "DND5E.UNITS.DISTANCE.Kilometer.Label",
    abbreviation: "DND5E.UNITS.DISTANCE.Kilometer.Abbreviation",
    conversion: 10_000 / 3, // Matching simplified conversion
    formattingUnit: "kilometer",
    type: "metric"
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
      icon: "systems/dnd5e/icons/svg/statuses/encumbered.svg"
    },
    heavilyEncumbered: {
      name: "EFFECT.DND5E.StatusHeavilyEncumbered",
      icon: "systems/dnd5e/icons/svg/statuses/heavily-encumbered.svg"
    },
    exceedingCarryingCapacity: {
      name: "EFFECT.DND5E.StatusExceedingCarryingCapacity",
      icon: "systems/dnd5e/icons/svg/statuses/exceeding-carrying-capacity.svg"
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
 *                                 "radius", "width", "height", "length", "thickness". No more than 3 dimensions may
 *                                 be specified.
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
 * @property {string[]} [activationPeriods]         Activation types that should be displayed in the chat card.
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
    label: "DND5E.REST.Long.Label",
    activationPeriods: ["longRest"],
    recoverHitDice: true,
    recoverHitPoints: true,
    recoverPeriods: ["lr", "sr"],
    recoverSpellSlotTypes: new Set(["leveled", "pact"])
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
 * @type {number[][]}
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

/**
 * Configuration data for pact casting progression.
 *
 * @typedef {object} PactProgressionConfig
 * @property {number} slots  Number of spell slots granted.
 * @property {number} level  Level of spells that can be cast.
 */

/**
 * Define the pact slot & level progression by pact caster level.
 * @enum {PactProgressionConfig}
 */
DND5E.pactCastingProgression = {
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
 * Configuration data for spell preparation modes.
 *
 * @typedef {object} SpellPreparationModeConfiguration
 * @property {string} label           Localized name of this spell preparation type.
 * @property {boolean} [upcast]       Whether this preparation mode allows for upcasting.
 * @property {boolean} [cantrips]     Whether this mode allows for cantrips in a spellbook.
 * @property {number} [order]         The sort order of this mode in a spellbook.
 * @property {boolean} [prepares]     Whether this preparation mode prepares spells.
 */

/**
 * Various different ways a spell can be prepared.
 * @enum {SpellPreparationModeConfiguration}
 */
DND5E.spellPreparationModes = {
  prepared: {
    label: "DND5E.SpellPrepPrepared",
    upcast: true,
    prepares: true
  },
  pact: {
    label: "DND5E.PactMagic",
    upcast: true,
    cantrips: true,
    order: 0.5
  },
  always: {
    label: "DND5E.SpellPrepAlways",
    upcast: true,
    prepares: true
  },
  atwill: {
    label: "DND5E.SpellPrepAtWill",
    order: -30
  },
  innate: {
    label: "DND5E.SpellPrepInnate",
    order: -20
  },
  ritual: {
    label: "DND5E.SpellPrepRitual",
    order: -10
  }
};
preLocalize("spellPreparationModes", { key: "label" });

/* -------------------------------------------- */

/**
 * Configuration data for different types of spellcasting supported.
 *
 * @typedef {object} SpellcastingTypeConfiguration
 * @property {string} label                               Localized label.
 * @property {string} img                                 Image used when rendered as a favorite on the sheet.
 * @property {boolean} [shortRest]                        Are these spell slots additionally restored on a short rest?
 * @property {Object<string, SpellcastingProgressionConfiguration>} [progression]  Any progression modes for this type.
 */

/**
 * Configuration data for a spellcasting progression mode.
 *
 * @typedef {object} SpellcastingProgressionConfiguration
 * @property {string} label             Localized label.
 * @property {number} [divisor=1]       Value by which the class levels are divided to determine spellcasting level.
 * @property {boolean} [roundUp=false]  Should fractional values should be rounded up by default?
 */

/**
 * Different spellcasting types and their progression.
 * @type {SpellcastingTypeConfiguration}
 */
DND5E.spellcastingTypes = {
  leveled: {
    label: "DND5E.SpellProgLeveled",
    img: "systems/dnd5e/icons/spell-tiers/{id}.webp",
    progression: {
      full: {
        label: "DND5E.SpellProgFull",
        divisor: 1
      },
      half: {
        label: "DND5E.SpellProgHalf",
        divisor: 2,
        roundUp: true
      },
      third: {
        label: "DND5E.SpellProgThird",
        divisor: 3
      },
      artificer: {
        label: "DND5E.SpellProgArt",
        divisor: 2,
        roundUp: true
      }
    }
  },
  pact: {
    label: "DND5E.SpellProgPact",
    img: "icons/magic/unholy/silhouette-robe-evil-power.webp",
    shortRest: true
  }
};
preLocalize("spellcastingTypes", { key: "label", sort: true });
preLocalize("spellcastingTypes.leveled.progression", { key: "label" });

/* -------------------------------------------- */

/**
 * Ways in which a class can contribute to spellcasting levels.
 * @enum {string}
 */
DND5E.spellProgression = {
  none: "DND5E.SpellNone",
  full: "DND5E.SpellProgFull",
  half: "DND5E.SpellProgHalf",
  third: "DND5E.SpellProgThird",
  pact: "DND5E.SpellProgPact",
  artificer: "DND5E.SpellProgArt"
};
preLocalize("spellProgression", { key: "label" });

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
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.849AYEWw9FHD6JNz"
  },
  con: {
    label: "DND5E.SchoolCon",
    icon: "systems/dnd5e/icons/svg/schools/conjuration.svg",
    fullKey: "conjuration",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.TWyKMhZJZGqQ6uls"
  },
  div: {
    label: "DND5E.SchoolDiv",
    icon: "systems/dnd5e/icons/svg/schools/divination.svg",
    fullKey: "divination",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.HoD2MwzmVbMqj9se"
  },
  enc: {
    label: "DND5E.SchoolEnc",
    icon: "systems/dnd5e/icons/svg/schools/enchantment.svg",
    fullKey: "enchantment",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.SehPXk24ySBVOwCZ"
  },
  evo: {
    label: "DND5E.SchoolEvo",
    icon: "systems/dnd5e/icons/svg/schools/evocation.svg",
    fullKey: "evocation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kGp1RNuxL2SELLRC"
  },
  ill: {
    label: "DND5E.SchoolIll",
    icon: "systems/dnd5e/icons/svg/schools/illusion.svg",
    fullKey: "illusion",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.smEk7kvVyslFozrB"
  },
  nec: {
    label: "DND5E.SchoolNec",
    icon: "systems/dnd5e/icons/svg/schools/necromancy.svg",
    fullKey: "necromancy",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.W0eyiV1FBmngb6Qh"
  },
  trs: {
    label: "DND5E.SchoolTrs",
    icon: "systems/dnd5e/icons/svg/schools/transmutation.svg",
    fullKey: "transmutation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.IYWewSailtmv6qEb"
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
    vision: {
      label: "DND5E.TRANSFORM.Setting.Keep.Vision.Label",
      default: true
    },
    self: {
      label: "DND5E.TRANSFORM.Setting.Keep.Self.Label",
      hint: "DND5E.TRANSFORM.Setting.Keep.Self.Hint",
      disables: ["keep.*", "merge.*"]
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
        keep: new Set(["bio", "class", "feats", "hp", "mental", "type"]),
        merge: new Set(["saves", "skills"]),
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

/**
 * Settings to configure how actors are merged when polymorphing is applied.
 * @enum {string}
 * @deprecated since DnD5e 4.4, available until DnD5e 5.0
 */
DND5E.polymorphSettings = new Proxy(DND5E.transformation, {
  get(target, prop) {
    if ( typeof prop !== "string" ) return target[prop];
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.polymorphSettings` is deprecated, use `CONFIG.DND5E.transformation` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    const [category, key] = TransformationSetting._splitDeprecatedKey(prop);
    return target[category]?.[key]?.label;
  },
  set(target, prop, value) {
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.polymorphSettings` is deprecated, use `CONFIG.DND5E.transformation` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    const [category, key] = TransformationSetting._splitDeprecatedKey(prop);
    if ( !category ) return false;
    target[category][key] = { label: value };
    return true;
  }
});

/**
 * Settings to configure how actors are effects are merged when polymorphing is applied.
 * @enum {string}
 * @deprecated since DnD5e 4.4, available until DnD5e 5.0
 */
DND5E.polymorphEffectSettings = new Proxy(DND5E.transformation, {
  get(target, prop) {
    if ( typeof prop !== "string" ) return target[prop];
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.polymorphEffectSettings` is deprecated, use `CONFIG.DND5E.transformation` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    if ( prop === "keepAE" ) return target.effects.all?.label;
    const [category, key] = TransformationSetting._splitDeprecatedKey(prop);
    return target[category]?.[key]?.label;
  },
  set(target, prop, value) {
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.polymorphEffectSettings` is deprecated, use `CONFIG.DND5E.transformation` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    if ( prop === "keepAE" ) {
      target.effects.all = { label: value };
      return true;
    }
    const [category, key] = TransformationSetting._splitDeprecatedKey(prop);
    if ( !category ) return false;
    target[category][key] = { label: value };
    return true;
  }
});

/**
 * Settings to configure how actors are merged when preset polymorphing is applied.
 * @enum {object}
 */
DND5E.transformationPresets = new Proxy(DND5E.transformation, {
  get(target, prop) {
    if ( typeof prop !== "string" ) return target[prop];
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.transformationPresets` is deprecated, use `CONFIG.DND5E.transformation.presets` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    const preset = target.presets[prop];
    if ( !preset ) return;
    const setting = new TransformationSetting(preset.settings);
    return {
      icon: preset.icon,
      label: preset.label,
      options: {
        ...setting._toDeprecatedConfig(),
        preset: prop
      }
    };
  },
  set(target, prop, value) {
    foundry.utils.logCompatibilityWarning(
      "`CONFIG.DND5E.transformationPresets` is deprecated, use `CONFIG.DND5E.transformation.presets` instead.",
      { since: "DnD5e 4.4", until: "DnD5e 5.0", once: true }
    );
    const preset = {
      label: value.label,
      icon: value.icon,
      settings: TransformationSetting._fromDeprecatedConfig(value.options ?? {})
    };
    target.presets[prop] = preset.toObject();
    return true;
  }
});

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
 * @property {string} icon              Icon used to represent the condition on the token.
 * @property {number} [order]           Order status to the start of the token HUD, rather than alphabetically.
 * @property {string} [reference]       UUID of a journal entry with details on this condition.
 * @property {string} [special]         Set this condition as a special status effect under this name.
 * @property {string[]} [riders]        Additional conditions, by id, to apply as part of this condition.
 * @property {string} [exclusiveGroup]  Any status effects with the same group will not be able to be applied at the
 *                                      same time through the token HUD (multiple statuses applied through other
 *                                      effects can still coexist).
 * @property {number} [coverBonus]      A bonus this condition provides to AC and dexterity saving throws.
 */

/**
 * Configuration data for system status effects.
 * @typedef {Omit<StatusEffectConfig, "img"> & _StatusEffectConfig5e} StatusEffectConfig5e
 */

/**
 * @typedef {object} _ConditionConfiguration
 * @property {string} label        Localized label for the condition.
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
    label: "EFFECT.DND5E.StatusBleeding",
    icon: "systems/dnd5e/icons/svg/statuses/bleeding.svg",
    pseudo: true
  },
  blinded: {
    label: "DND5E.ConBlinded",
    icon: "systems/dnd5e/icons/svg/statuses/blinded.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ",
    special: "BLIND"
  },
  burning: {
    label: "EFFECT.DND5E.StatusBurning",
    icon: "systems/dnd5e/icons/svg/statuses/burning.svg",
    pseudo: true
  },
  charmed: {
    label: "DND5E.ConCharmed",
    icon: "systems/dnd5e/icons/svg/statuses/charmed.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.zZaEBrKkr66OWJvD"
  },
  cursed: {
    label: "EFFECT.DND5E.StatusCursed",
    icon: "systems/dnd5e/icons/svg/statuses/cursed.svg",
    pseudo: true
  },
  dehydration: {
    label: "EFFECT.DND5E.StatusDehydration",
    icon: "systems/dnd5e/icons/svg/statuses/dehydration.svg",
    pseudo: true
  },
  deafened: {
    label: "DND5E.ConDeafened",
    icon: "systems/dnd5e/icons/svg/statuses/deafened.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.6G8JSjhn701cBITY"
  },
  diseased: {
    label: "DND5E.ConDiseased",
    icon: "systems/dnd5e/icons/svg/statuses/diseased.svg",
    pseudo: true,
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.oNQWvyRZkTOJ8PBq"
  },
  exhaustion: {
    label: "DND5E.ConExhaustion",
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.cspWveykstnu3Zcv",
    levels: 6,
    reduction: { rolls: 2, speed: 5 }
  },
  falling: {
    label: "EFFECT.DND5E.StatusFalling",
    icon: "systems/dnd5e/icons/svg/statuses/falling.svg",
    pseudo: true
  },
  frightened: {
    label: "DND5E.ConFrightened",
    icon: "systems/dnd5e/icons/svg/statuses/frightened.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.oreoyaFKnvZCrgij"
  },
  grappled: {
    label: "DND5E.ConGrappled",
    icon: "systems/dnd5e/icons/svg/statuses/grappled.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.gYDAhd02ryUmtwZn"
  },
  incapacitated: {
    label: "DND5E.ConIncapacitated",
    icon: "systems/dnd5e/icons/svg/statuses/incapacitated.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.TpkZgLfxCmSndmpb"
  },
  invisible: {
    label: "DND5E.ConInvisible",
    icon: "systems/dnd5e/icons/svg/statuses/invisible.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.3UU5GCTVeRDbZy9u"
  },
  malnutrition: {
    label: "EFFECT.DND5E.StatusMalnutrition",
    icon: "systems/dnd5e/icons/svg/statuses/malnutrition.svg",
    pseudo: true
  },
  paralyzed: {
    label: "DND5E.ConParalyzed",
    icon: "systems/dnd5e/icons/svg/statuses/paralyzed.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.xnSV5hLJIMaTABXP",
    statuses: ["incapacitated"]
  },
  petrified: {
    label: "DND5E.ConPetrified",
    icon: "systems/dnd5e/icons/svg/statuses/petrified.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.xaNDaW6NwQTgHSmi",
    statuses: ["incapacitated"]
  },
  poisoned: {
    label: "DND5E.ConPoisoned",
    icon: "systems/dnd5e/icons/svg/statuses/poisoned.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.lq3TRI6ZlED8ABMx"
  },
  prone: {
    label: "DND5E.ConProne",
    icon: "systems/dnd5e/icons/svg/statuses/prone.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.y0TkcdyoZlOTmAFT"
  },
  restrained: {
    label: "DND5E.ConRestrained",
    icon: "systems/dnd5e/icons/svg/statuses/restrained.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.cSVcyZyNe2iG1fIc"
  },
  silenced: {
    label: "EFFECT.DND5E.StatusSilenced",
    icon: "systems/dnd5e/icons/svg/statuses/silenced.svg",
    pseudo: true
  },
  stunned: {
    label: "DND5E.ConStunned",
    icon: "systems/dnd5e/icons/svg/statuses/stunned.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.ZyZMUwA2rboh4ObS",
    statuses: ["incapacitated"]
  },
  suffocation: {
    label: "EFFECT.DND5E.StatusSuffocation",
    icon: "systems/dnd5e/icons/svg/statuses/suffocation.svg",
    pseudo: true
  },
  surprised: {
    label: "EFFECT.DND5E.StatusSurprised",
    icon: "systems/dnd5e/icons/svg/statuses/surprised.svg",
    pseudo: true
  },
  transformed: {
    label: "EFFECT.DND5E.StatusTransformed",
    icon: "systems/dnd5e/icons/svg/statuses/transformed.svg",
    pseudo: true
  },
  unconscious: {
    label: "DND5E.ConUnconscious",
    icon: "systems/dnd5e/icons/svg/statuses/unconscious.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.UWw13ISmMxDzmwbd",
    statuses: ["incapacitated"],
    riders: ["prone"]
  }
};
preLocalize("conditionTypes", { key: "label", sort: true });

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
  halfHealth: new Set(["exhaustion-4"])
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
    icon: "systems/dnd5e/icons/svg/statuses/burrowing.svg",
    special: "BURROW"
  },
  concentrating: {
    name: "EFFECT.DND5E.StatusConcentrating",
    icon: "systems/dnd5e/icons/svg/statuses/concentrating.svg",
    special: "CONCENTRATING"
  },
  coverHalf: {
    name: "EFFECT.DND5E.StatusHalfCover",
    icon: "systems/dnd5e/icons/svg/statuses/cover-half.svg",
    order: 2,
    exclusiveGroup: "cover",
    coverBonus: 2
  },
  coverThreeQuarters: {
    name: "EFFECT.DND5E.StatusThreeQuartersCover",
    icon: "systems/dnd5e/icons/svg/statuses/cover-three-quarters.svg",
    order: 3,
    exclusiveGroup: "cover",
    coverBonus: 5
  },
  coverTotal: {
    name: "EFFECT.DND5E.StatusTotalCover",
    icon: "systems/dnd5e/icons/svg/statuses/cover-total.svg",
    order: 4,
    exclusiveGroup: "cover"
  },
  dead: {
    name: "EFFECT.DND5E.StatusDead",
    icon: "systems/dnd5e/icons/svg/statuses/dead.svg",
    special: "DEFEATED",
    order: 1
  },
  dodging: {
    name: "EFFECT.DND5E.StatusDodging",
    icon: "systems/dnd5e/icons/svg/statuses/dodging.svg"
  },
  ethereal: {
    name: "EFFECT.DND5E.StatusEthereal",
    icon: "systems/dnd5e/icons/svg/statuses/ethereal.svg"
  },
  flying: {
    name: "EFFECT.DND5E.StatusFlying",
    icon: "systems/dnd5e/icons/svg/statuses/flying.svg",
    special: "FLY"
  },
  hiding: {
    name: "EFFECT.DND5E.StatusHiding",
    icon: "systems/dnd5e/icons/svg/statuses/hiding.svg"
  },
  hovering: {
    name: "EFFECT.DND5E.StatusHovering",
    icon: "systems/dnd5e/icons/svg/statuses/hovering.svg",
    special: "HOVER"
  },
  marked: {
    name: "EFFECT.DND5E.StatusMarked",
    icon: "systems/dnd5e/icons/svg/statuses/marked.svg"
  },
  sleeping: {
    name: "EFFECT.DND5E.StatusSleeping",
    icon: "systems/dnd5e/icons/svg/statuses/sleeping.svg",
    statuses: ["incapacitated", "unconscious"]
  },
  stable: {
    name: "EFFECT.DND5E.StatusStable",
    icon: "systems/dnd5e/icons/svg/statuses/stable.svg"
  }
};

/* -------------------------------------------- */

/**
 * Configuration for the special bloodied status effect.
 * @type {{ name: string, icon: string, threshold: number }}
 */
DND5E.bloodied = {
  name: "EFFECT.DND5E.StatusBloodied",
  icon: "systems/dnd5e/icons/svg/statuses/bloodied.svg",
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
    expertise: true
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
    expertise: true
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
    configKey: "conditionTypes"
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

/**
 * Flags allowed on actors. Any flags not in the list may be deleted during a migration.
 * @type {string[]}
 */
DND5E.allowedActorFlags = ["isPolymorphed", "originalActor"].concat(Object.keys(DND5E.characterFlags));

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

const _ALL_ITEM_TYPES = ["background", "class", "race", "subclass"];

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
  inspiration: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.nkEPI89CiQnOaLYh",
  carryingcapacity: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.1PnjDBKbQJIVyc2t",
  push: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Hni8DjqLzoqsVjb6",
  lift: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Hni8DjqLzoqsVjb6",
  drag: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Hni8DjqLzoqsVjb6",
  encumbrance: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.JwqYf9qb6gJAWZKs",
  hiding: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.plHuoNdS0j3umPNS",
  passiveperception: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.988C2hQNyvqkdbND",
  time: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.eihqNjwpZ3HM4IqY",
  speed: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.HhqeIiSj8sE1v1qZ",
  travelpace: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.eFAISahBloR2X8MX",
  forcedmarch: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.uQWQpRKQ1kWhuvjZ",
  difficultterrainpace: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hFW5BR2yHHwwgurD",
  climbing: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KxUXbMrUCIAhv4AF",
  swimming: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KxUXbMrUCIAhv4AF",
  longjump: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.1U0myNrOvIVBUdJV",
  highjump: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.raPwIkqKSv60ELmy",
  falling: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kREHL5pgNUOhay9f",
  suffocating: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.BIlnr0xYhqt4TGsi",
  vision: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.O6hamUbI9kVASN8b",
  light: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.O6hamUbI9kVASN8b",
  lightlyobscured: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MAxtfJyvJV7EpzWN",
  heavilyobscured: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.wPFjfRruboxhtL4b",
  brightlight: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.RnMokVPyKGbbL8vi",
  dimlight: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.n1Ocpbyhr6HhgbCG",
  darkness: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4dfREIDjG5N4fvxd",
  blindsight: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.sacjsfm9ZXnw4Tqc",
  darkvision: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ldmA1PbnEGVkmE11",
  tremorsense: "Compendium.dnd5e.rules.JournalEntry.eVtpEGXjA2tamEIJ.JournalEntryPage.8AIlZ95v54mL531X",
  truesight: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kNa8rJFbtaTM3Rmk",
  food: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jayo7XVgGnRCpTW0",
  water: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iIEI87J7lr2sqtb5",
  resting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.dpHJXYLigIdEseIb",
  shortrest: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.1s2swI3UsjUUgbt2",
  longrest: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6cLtjbHn4KV2R7G9",
  surprise: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.YmOt8HderKveA19K",
  initiative: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.RcwElV4GAcVXKWxo",
  bonusaction: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.2fu2CXsDg8gQmGGw",
  reaction: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.2VqLyxMyMxgXe2wC",
  difficultterrain: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6tqz947qO8vPyxvD",
  beingprone: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.bV8akkBdVUUG21CO",
  droppingprone: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hwTLpAtSS5OqQsI1",
  standingup: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hwTLpAtSS5OqQsI1",
  crawling: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.VWG9qe8PUNtS28Pw",
  movingaroundothercreatures: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9ZWCknaXCOdhyOrX",
  flying: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.0B1fxfmw0a48tPsc",
  size: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.HWHRQVBVG7K0RVVW",
  space: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.WIA5bs3P45PmO3OS",
  squeezing: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.wKtOwagDAiNfVoPS",
  attack: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.u4GQCzoBig20yRLj",
  castaspell: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.GLwN36E4WXn3Cp4Z",
  dash: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Jqn0MEvq6fduYNo6",
  disengage: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ZOPRfI48NyjoloEF",
  dodge: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.V1BkwK2HQrtEfa4d",
  help: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KnrD3u2AnQfmtOWj",
  hide: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.BXlHhE4ZoiFwiXLK",
  ready: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8xJzZVelP2AmQGfU",
  search: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5cn1ZTLgQq95vfZx",
  useanobject: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ljqhJx8Qxu2ivo69",
  attackrolls: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5wkqEqhbBD5kDeE7",
  unseenattackers: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5ZJNwEPlsGurecg5",
  unseentargets: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.5ZJNwEPlsGurecg5",
  rangedattacks: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.S9aclVOCbusLE3kC",
  range: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.HjKXuB8ndjcqOds7",
  rangedattacksinclosecombat: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.qEZvxW0NM7ixSQP5",
  meleeattacks: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.GTk6emvzNxl8Oosl",
  reach: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hgZ5ZN4B3y7tmFlt",
  unarmedstrike: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.xJjJ4lhymAYXAOvO",
  opportunityattacks: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.zeU0NyCyP10lkLg3",
  twoweaponfighting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.FQTS08uH74A6psL2",
  grappling: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Sl4bniSPSbyrakM2",
  escapingagrapple: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.2TZKy9YbMN3ZY3h8",
  movingagrappledcreature: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.x5bUdhAD7u5Bt2rg",
  shoving: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hrdqMF8hRXJdNzJx",
  cover: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.W7f7PcRubNUMIq2S",
  halfcover: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hv0J61IAfofuhy3Q",
  threequarterscover: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.zAMStUjUrPV10dFm",
  totalcover: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.BKUAxXuPEzxiEOeL",
  hitpoints: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.PFbzoMBviI2DD9QP",
  damagerolls: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hd26AqKrCqtcQBWy",
  criticalhits: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.gFL1VhSEljL1zvje",
  damagetypes: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jVOgf7DNEhkzYNIe",
  damageresistance: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.v0WE18nT5SJO8Ft7",
  damagevulnerability: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.v0WE18nT5SJO8Ft7",
  healing: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ICketFqbFslqKiX9",
  instantdeath: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8BG05mA0mEzwmrHU",
  deathsavingthrows: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.JL8LePEJQYFdNuLL",
  deathsaves: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.JL8LePEJQYFdNuLL",
  stabilizing: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.r1CgZXLcqFop6Dlx",
  knockingacreatureout: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.uEwjgKGuCRTNADYv",
  temporaryhitpoints: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AW6HpJZHqxfESXaq",
  temphp: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AW6HpJZHqxfESXaq",
  mounting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MFpyvUIdcBpC9kIE",
  dismounting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MFpyvUIdcBpC9kIE",
  controllingamount: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.khmR2xFk1NxoQUgZ",
  underwatercombat: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6zVOeLyq4iMnrQT4",
  spelllevel: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.A6k5fS0kFqPXTW3v",
  knownspells: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.oezg742GlxmEwT85",
  preparedspells: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.oezg742GlxmEwT85",
  spellslots: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Su6wbb0O9UN4ZDIH",
  castingatahigherlevel: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4H9SLM95OCLfFizz",
  upcasting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4H9SLM95OCLfFizz",
  castinginarmor: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.z4A8vHSK2pb8YA9X",
  cantrips: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jZD5mCTnMPJ9jW67",
  rituals: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.FjWqT5iyJ89kohdA",
  castingtime: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.zRVW8Tvyk6BECjZD",
  bonusactioncasting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.RP1WL9FXI3aknlxZ",
  reactioncasting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.t62lCfinwU9H7Lji",
  longercastingtimes: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.gOAIRFCyPUx42axn",
  spellrange: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.RBYPyE5z5hAZSbH6",
  components: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.xeHthAF9lxfn2tII",
  verbal: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6UXTNWMCQ0nSlwwx",
  spellduration: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9mp0SRsptjvJcq1e",
  instantaneous: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kdlgZOpRMB6bGCod",
  concentrating: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ow58p27ctAnr4VPH",
  spelltargets: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.G80AIQr04sxdVpw4",
  areaofeffect: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.wvtCeGHgnUmh0cuj",
  pointoforigin: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8HxbRceQQUAhyWRt",
  spellsavingthrows: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8DajfNll90eeKcmB",
  spellattackrolls: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.qAFzmGZKhVvAEUF3",
  combiningmagicaleffects: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.TMIN963hG773yZzO",
  schoolsofmagic: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.TeF6CKMDRpYpsLd4",
  detectingtraps: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.DZ7AhdQ94xggG4bj",
  disablingtraps: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.DZ7AhdQ94xggG4bj",
  curingmadness: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6Icem7G3CICdNOkM",
  damagethreshold: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9LJZhqvCburpags3",
  poisontypes: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.I6OMMWUaYCWR9xip",
  contactpoison: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kXnCEqqGUWRZeZDj",
  ingestedpoison: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Y0vsJYSWeQcFpJ27",
  inhaledpoison: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KUyN4eK1xTBzXsjP",
  injurypoison: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.LUL48OUq6SJeMGc7",
  attunement: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.UQ65OwIyGK65eiOK",
  wearingitems: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iPB8mGKuQx3X0Z2J",
  wieldingitems: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iPB8mGKuQx3X0Z2J",
  multipleitemsofthesamekind: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.rLJdvz4Mde8GkEYQ",
  paireditems: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.rd9pCH8yFraSGN34",
  commandword: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.HiXixxLYesv6Ff3t",
  consumables: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.UEPAcZFzQ5x196zE",
  itemspells: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.DABoaeeF6w31UCsj",
  charges: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.NLRXcgrpRCfsA5mO",
  spellscroll: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.gi8IKhtOlBVhMJrN",
  creaturetags: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9jV1fFF163dr68vd",
  telepathy: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.geTidcFIYWuUvD2L",
  legendaryactions: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.C1awOyZh78pq1xmY",
  lairactions: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.07PtjpMxiRIhkBEp",
  regionaleffects: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.uj8W27NKFyzygPUd",
  disease: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.oNQWvyRZkTOJ8PBq"
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
        tools: foundry.utils.deepClone(DND5E.toolIds)
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
