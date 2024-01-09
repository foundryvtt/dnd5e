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
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.nUPv6C66Ur64BIUH"
  },
  dex: {
    label: "DND5E.AbilityDex",
    abbreviation: "DND5E.AbilityDexAbbr",
    type: "physical",
    fullKey: "dexterity",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ER8CKDUWLsFXuARJ"
  },
  con: {
    label: "DND5E.AbilityCon",
    abbreviation: "DND5E.AbilityConAbbr",
    type: "physical",
    fullKey: "constitution",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.MpA4jnwD17Q0RPg7"
  },
  int: {
    label: "DND5E.AbilityInt",
    abbreviation: "DND5E.AbilityIntAbbr",
    type: "mental",
    fullKey: "intelligence",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.WzWWcTIppki35YvF",
    defaults: { vehicle: 0 }
  },
  wis: {
    label: "DND5E.AbilityWis",
    abbreviation: "DND5E.AbilityWisAbbr",
    type: "mental",
    fullKey: "wisdom",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.v3IPyTtqvXqN934s",
    defaults: { vehicle: 0 }
  },
  cha: {
    label: "DND5E.AbilityCha",
    abbreviation: "DND5E.AbilityChaAbbr",
    type: "mental",
    fullKey: "charisma",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.9FyghudYFV5QJOuG",
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
 * Configure which ability score is used as the default modifier for initiative rolls.
 * @type {string}
 */
DND5E.initiativeAbility = "dex";

/**
 * Configure which ability score is used when calculating hit points per level.
 * @type {string}
 */
DND5E.hitPointsAbility = "con";

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
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.AvvBLEHNl7kuwPkN"
  },
  ani: {
    label: "DND5E.SkillAni",
    ability: "wis",
    fullKey: "animalHandling",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.xb3MCjUvopOU4viE"
  },
  arc: {
    label: "DND5E.SkillArc",
    ability: "int",
    fullKey: "arcana",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.h3bYSPge8IOqne1N"
  },
  ath: {
    label: "DND5E.SkillAth",
    ability: "str",
    fullKey: "athletics",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.rIR7ttYDUpH3tMzv"
  },
  dec: {
    label: "DND5E.SkillDec",
    ability: "cha",
    fullKey: "deception",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.mqVZ2fz0L7a9VeKJ"
  },
  his: {
    label: "DND5E.SkillHis",
    ability: "int",
    fullKey: "history",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kRBZbdWMGW9K3wdY"
  },
  ins: {
    label: "DND5E.SkillIns",
    ability: "wis",
    fullKey: "insight",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.8R5SMbAGbECNgO8z"
  },
  itm: {
    label: "DND5E.SkillItm",
    ability: "cha",
    fullKey: "intimidation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4VHHI2gJ1jEsppfg"
  },
  inv: {
    label: "DND5E.SkillInv",
    ability: "int",
    fullKey: "investigation",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.Y7nmbQAruWOs7WRM"
  },
  med: {
    label: "DND5E.SkillMed",
    ability: "wis",
    fullKey: "medicine",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.GeYmM7BVfSCAga4o"
  },
  nat: {
    label: "DND5E.SkillNat",
    ability: "int",
    fullKey: "nature",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.ueMx3uF2PQlcye31"
  },
  prc: {
    label: "DND5E.SkillPrc",
    ability: "wis",
    fullKey: "perception",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.zjEeHCUqfuprfzhY"
  },
  prf: {
    label: "DND5E.SkillPrf",
    ability: "cha",
    fullKey: "performance",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hYT7Z06yDNBcMtGe"
  },
  per: {
    label: "DND5E.SkillPer",
    ability: "cha",
    fullKey: "persuasion",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4R5H8iIsdFQTsj3X"
  },
  rel: {
    label: "DND5E.SkillRel",
    ability: "int",
    fullKey: "religion",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.CXVzERHdP4qLhJXM"
  },
  slt: {
    label: "DND5E.SkillSlt",
    ability: "dex",
    fullKey: "sleightOfHand",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.yg6SRpGNVz9nDW0A"
  },
  ste: {
    label: "DND5E.SkillSte",
    ability: "dex",
    fullKey: "stealth",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.4MfrpERNiQXmvgCI"
  },
  sur: {
    label: "DND5E.SkillSur",
    ability: "wis",
    fullKey: "survival",
    reference: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.t3EzDU5b9BVAIEVi"
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
 * @enum {number}
 */
DND5E.attunementTypes = {
  NONE: 0,
  REQUIRED: 1,
  ATTUNED: 2
};

/**
 * An enumeration of item attunement states.
 * @type {{"0": string, "1": string, "2": string}}
 */
DND5E.attunements = {
  0: "DND5E.AttunementNone",
  1: "DND5E.AttunementRequired",
  2: "DND5E.AttunementAttuned"
};
preLocalize("attunements");

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
 * The basic tool types in 5e. This enables specific tool proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
DND5E.toolIds = {
  alchemist: "SztwZhbhZeCqyAes",
  bagpipes: "yxHi57T5mmVt0oDr",
  brewer: "Y9S75go1hLMXUD48",
  calligrapher: "jhjo20QoiD5exf09",
  card: "YwlHI3BVJapz4a3E",
  carpenter: "8NS6MSOdXtUqD7Ib",
  cartographer: "fC0lFK8P4RuhpfaU",
  chess: "23y8FvWKf9YLcnBL",
  cobbler: "hM84pZnpCqKfi8XH",
  cook: "Gflnp29aEv5Lc1ZM",
  dice: "iBuTM09KD9IoM5L8",
  disg: "IBhDAr7WkhWPYLVn",
  drum: "69Dpr25pf4BjkHKb",
  dulcimer: "NtdDkjmpdIMiX7I2",
  flute: "eJOrPcAz9EcquyRQ",
  forg: "cG3m4YlHfbQlLEOx",
  glassblower: "rTbVrNcwApnuTz5E",
  herb: "i89okN7GFTWHsvPy",
  horn: "aa9KuBy4dst7WIW9",
  jeweler: "YfBwELTgPFHmQdHh",
  leatherworker: "PUMfwyVUbtyxgYbD",
  lute: "qBydtUUIkv520DT7",
  lyre: "EwG1EtmbgR3bM68U",
  mason: "skUih6tBvcBbORzA",
  navg: "YHCmjsiXxZ9UdUhU",
  painter: "ccm5xlWhx74d6lsK",
  panflute: "G5m5gYIx9VAUWC3J",
  pois: "il2GNi8C0DvGLL9P",
  potter: "hJS8yEVkqgJjwfWa",
  shawm: "G3cqbejJpfB91VhP",
  smith: "KndVe2insuctjIaj",
  thief: "woWZ1sO5IUVGzo58",
  tinker: "0d08g1i5WXnNrCNA",
  viol: "baoe3U5BfMMMxhCU",
  weaver: "ap9prThUB2y9lDyj",
  woodcarver: "xKErqkLo4ASYr5EP"
};

/* -------------------------------------------- */

/**
 * Time periods that accept a numeric value.
 * @enum {string}
 */
DND5E.scalarTimePeriods = {
  turn: "DND5E.TimeTurn",
  round: "DND5E.TimeRound",
  minute: "DND5E.TimeMinute",
  hour: "DND5E.TimeHour",
  day: "DND5E.TimeDay",
  month: "DND5E.TimeMonth",
  year: "DND5E.TimeYear"
};
preLocalize("scalarTimePeriods");

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
  legendary: "DND5E.LegendaryActionLabel",
  mythic: "DND5E.MythicActionLabel",
  lair: "DND5E.LairActionLabel",
  crew: "DND5E.VehicleCrewAction"
};
preLocalize("abilityActivationTypes");

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
 * Configuration data for actor sizes.
 *
 * @typedef {object} ActorSizeConfiguration
 * @property {string} label                   Localized label.
 * @property {string} abbreviation            Localized abbreviation.
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
    token: 0.5,
    capacityMultiplier: 0.5
  },
  sm: {
    label: "DND5E.SizeSmall",
    abbreviation: "DND5E.SizeSmallAbbr"
  },
  med: {
    label: "DND5E.SizeMedium",
    abbreviation: "DND5E.SizeMediumAbbr"
  },
  lg: {
    label: "DND5E.SizeLarge",
    abbreviation: "DND5E.SizeLargeAbbr",
    token: 2,
    capacityMultiplier: 2
  },
  huge: {
    label: "DND5E.SizeHuge",
    abbreviation: "DND5E.SizeHugeAbbr",
    token: 3,
    capacityMultiplier: 4
  },
  grg: {
    label: "DND5E.SizeGargantuan",
    abbreviation: "DND5E.SizeGargantuanAbbr",
    token: 4,
    capacityMultiplier: 8
  }
};
preLocalize("actorSizes", { keys: ["label", "abbreviation"] });
patchConfig("actorSizes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });

/**
 * Default token image size for the values of `DND5E.actorSizes`.
 * @enum {number}
 * @deprecated since DnD5e 3.0, available until DnD5e 3.2
 */
Object.defineProperty(DND5E, "tokenSizes", {
  get() {
    foundry.utils.logCompatibilityWarning(
      "DND5E.tokenSizes has been deprecated and is now accessible through the .token property on DND5E.actorSizes.",
      { since: "DnD5e 3.0", until: "DnD5e 3.2" }
    );
    return Object.entries(DND5E.actorSizes).reduce((obj, [k, v]) => {
      obj[k] = v.token ?? 1;
      return obj;
    }, {});
  }
});

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
 * Settings used to render map location markers on the canvas.
 * @type {object}
 */
DND5E.mapLocationMarker = {
  default: {
    backgroundColor: 0xFBF8F5,
    borderColor: 0x000000,
    borderHoverColor: 0xFF5500,
    font: null,
    textColor: 0x000000
  }
};

/* -------------------------------------------- */

/**
 * Default types of creatures.
 * @enum {{ label: string, plural: string, [detectAlignment]: boolean }}
 */
DND5E.creatureTypes = {
  aberration: {
    label: "DND5E.CreatureAberration",
    plural: "DND5E.CreatureAberrationPl",
    icon: "/icons/creatures/tentacles/tentacle-eyes-yellow-pink.webp",
    detectAlignment: true
  },
  beast: {
    label: "DND5E.CreatureBeast",
    plural: "DND5E.CreatureBeastPl",
    icon: "/icons/creatures/claws/claw-bear-paw-swipe-red.webp"
  },
  celestial: {
    label: "DND5E.CreatureCelestial",
    plural: "DND5E.CreatureCelestialPl",
    icon: "/icons/creatures/abilities/wings-birdlike-blue.webp",
    detectAlignment: true
  },
  construct: {
    label: "DND5E.CreatureConstruct",
    plural: "DND5E.CreatureConstructPl",
    icon: "/icons/creatures/magical/construct-stone-earth-gray.webp"
  },
  dragon: {
    label: "DND5E.CreatureDragon",
    plural: "DND5E.CreatureDragonPl",
    icon: "/icons/creatures/abilities/dragon-fire-breath-orange.webp"
  },
  elemental: {
    label: "DND5E.CreatureElemental",
    plural: "DND5E.CreatureElementalPl",
    icon: "/icons/creatures/magical/spirit-fire-orange.webp",
    detectAlignment: true
  },
  fey: {
    label: "DND5E.CreatureFey",
    plural: "DND5E.CreatureFeyPl",
    icon: "/icons/creatures/magical/fae-fairy-winged-glowing-green.webp",
    detectAlignment: true
  },
  fiend: {
    label: "DND5E.CreatureFiend",
    plural: "DND5E.CreatureFiendPl",
    icon: "/icons/magic/death/skull-horned-goat-pentagram-red.webp",
    detectAlignment: true
  },
  giant: {
    label: "DND5E.CreatureGiant",
    plural: "DND5E.CreatureGiantPl",
    icon: "/icons/creatures/magical/humanoid-giant-forest-blue.webp"
  },
  humanoid: {
    label: "DND5E.CreatureHumanoid",
    plural: "DND5E.CreatureHumanoidPl",
    icon: "/icons/magic/unholy/strike-body-explode-disintegrate.webp"
  },
  monstrosity: {
    label: "DND5E.CreatureMonstrosity",
    plural: "DND5E.CreatureMonstrosityPl",
    icon: "/icons/creatures/abilities/mouth-teeth-rows-red.webp"
  },
  ooze: {
    label: "DND5E.CreatureOoze",
    plural: "DND5E.CreatureOozePl",
    icon: "/icons/creatures/slimes/slime-movement-pseudopods-green.webp"
  },
  plant: {
    label: "DND5E.CreaturePlant",
    plural: "DND5E.CreaturePlantPl",
    icon: "/icons/magic/nature/tree-animated-strike.webp"
  },
  undead: {
    label: "DND5E.CreatureUndead",
    plural: "DND5E.CreatureUndeadPl",
    icon: "/icons/magic/death/skull-horned-worn-fire-blue.webp",
    detectAlignment: true
  }
};
preLocalize("creatureTypes", { keys: ["label", "plural"], sort: true });
patchConfig("creatureTypes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });

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
  save: "DND5E.ActionSave",
  heal: "DND5E.ActionHeal",
  abil: "DND5E.ActionAbil",
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
 * The limited use periods that support a recovery formula.
 * @enum {string}
 */
DND5E.limitedUseFormulaPeriods = {
  charges: "DND5E.Charges",
  dawn: "DND5E.Dawn",
  dusk: "DND5E.Dusk"
};

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability.
 * @enum {string}
 */
DND5E.limitedUsePeriods = {
  sr: "DND5E.ShortRest",
  lr: "DND5E.LongRest",
  day: "DND5E.Day",
  ...DND5E.limitedUseFormulaPeriods
};
preLocalize("limitedUsePeriods");

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
  clothing: "DND5E.EquipmentClothing",
  trinket: "DND5E.EquipmentTrinket",
  vehicle: "DND5E.EquipmentVehicle"
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
  custom: {
    label: "DND5E.ArmorClassCustom"
  }
};
preLocalize("armorClasses", { key: "label" });

/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system.
 * @enum {string}
 */
DND5E.consumableTypes = {
  ammo: {
    label: "DND5E.ConsumableAmmo",
    subtypes: {
      arrow: "DND5E.ConsumableAmmoArrow",
      blowgunNeedle: "DND5E.ConsumableAmmoBlowgunNeedle",
      crossbowBolt: "DND5E.ConsumableAmmoCrossbowBolt",
      slingBullet: "DND5E.ConsumableAmmoSlingBullet"
    }
  },
  potion: {
    label: "DND5E.ConsumablePotion"
  },
  poison: {
    label: "DND5E.ConsumablePoison",
    subtypes: {
      contact: "DND5E.ConsumablePoisonContact",
      ingested: "DND5E.ConsumablePoisonIngested",
      inhaled: "DND5E.ConsumablePoisonInhaled",
      injury: "DND5E.ConsumablePoisonInjury"
    }
  },
  food: {
    label: "DND5E.ConsumableFood"
  },
  scroll: {
    label: "DND5E.ConsumableScroll"
  },
  wand: {
    label: "DND5E.ConsumableWand"
  },
  rod: {
    label: "DND5E.ConsumableRod"
  },
  trinket: {
    label: "DND5E.ConsumableTrinket"
  }
};
patchConfig("consumableTypes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });
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

/* -------------------------------------------- */

/**
 * Configuration data for an item with the "feature" type.
 *
 * @typedef {object} FeatureTypeConfiguration
 * @property {string} label                       Localized label for this type.
 * @property {Object<string, string>} [subtypes]  Enum containing localized labels for subtypes.
 */

/**
 * Types of "features" items.
 * @enum {FeatureTypeConfiguration}
 */
DND5E.featureTypes = {
  background: {
    label: "DND5E.Feature.Background"
  },
  class: {
    label: "DND5E.Feature.Class",
    subtypes: {
      arcaneShot: "DND5E.ClassFeature.ArcaneShot",
      artificerInfusion: "DND5E.ClassFeature.ArtificerInfusion",
      channelDivinity: "DND5E.ClassFeature.ChannelDivinity",
      defensiveTactic: "DND5E.ClassFeature.DefensiveTactic",
      eldritchInvocation: "DND5E.ClassFeature.EldritchInvocation",
      elementalDiscipline: "DND5E.ClassFeature.ElementalDiscipline",
      fightingStyle: "DND5E.ClassFeature.FightingStyle",
      huntersPrey: "DND5E.ClassFeature.HuntersPrey",
      ki: "DND5E.ClassFeature.Ki",
      maneuver: "DND5E.ClassFeature.Maneuver",
      metamagic: "DND5E.ClassFeature.Metamagic",
      multiattack: "DND5E.ClassFeature.Multiattack",
      pact: "DND5E.ClassFeature.PactBoon",
      psionicPower: "DND5E.ClassFeature.PsionicPower",
      rune: "DND5E.ClassFeature.Rune",
      superiorHuntersDefense: "DND5E.ClassFeature.SuperiorHuntersDefense"
    }
  },
  monster: {
    label: "DND5E.Feature.Monster"
  },
  race: {
    label: "DND5E.Feature.Race"
  },
  feat: {
    label: "DND5E.Feature.Feat"
  }
};
preLocalize("featureTypes", { key: "label" });
preLocalize("featureTypes.class.subtypes", { sort: true });

/* -------------------------------------------- */

/**
 * The various properties of all item types.
 * @enum {object}
 */
DND5E.itemProperties = {
  ada: {
    label: "DND5E.Item.PropertyAdamantine",
    isPhysical: true
  },
  amm: {
    label: "DND5E.Item.PropertyAmmunition"
  },
  concentration: {
    label: "DND5E.Item.PropertyConcentration",
    abbr: "DND5E.ConcentrationAbbr",
    isTag: true
  },
  fin: {
    label: "DND5E.Item.PropertyFinesse"
  },
  fir: {
    label: "DND5E.Item.PropertyFirearm"
  },
  foc: {
    label: "DND5E.Item.PropertyFocus"
  },
  hvy: {
    label: "DND5E.Item.PropertyHeavy"
  },
  lgt: {
    label: "DND5E.Item.PropertyLight"
  },
  lod: {
    label: "DND5E.Item.PropertyLoading"
  },
  material: {
    label: "DND5E.Item.PropertyMaterial"
  },
  mgc: {
    label: "DND5E.Item.PropertyMagical",
    isPhysical: true
  },
  rch: {
    label: "DND5E.Item.PropertyReach"
  },
  rel: {
    label: "DND5E.Item.PropertyReload"
  },
  ret: {
    label: "DND5E.Item.PropertyReturning"
  },
  ritual: {
    label: "DND5E.Item.PropertyRitual",
    abbr: "DND5E.RitualAbbr",
    isTag: true
  },
  sil: {
    label: "DND5E.Item.PropertySilvered",
    isPhysical: true
  },
  somatic: {
    label: "DND5E.Item.PropertySomatic"
  },
  spc: {
    label: "DND5E.Item.PropertySpecial"
  },
  stealthDisadvantage: {
    label: "DND5E.Item.PropertyStealthDisadvantage"
  },
  thr: {
    label: "DND5E.Item.PropertyThrown"
  },
  two: {
    label: "DND5E.Item.PropertyTwoHanded"
  },
  ver: {
    label: "DND5E.Item.PropertyVersatile"
  },
  vocal: {
    label: "DND5E.Item.PropertyVerbal"
  },
  weightlessContents: {
    label: "DND5E.Item.PropertyWeightlessContents"
  }
};
preLocalize("itemProperties", { keys: ["label", "abbr"], sort: true });

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
    "concentration",
    "mgc"
  ]),
  feat: new Set([
    "concentration",
    "mgc"
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
    "concentration",
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
    conversion: 0.1
  },
  gp: {
    label: "DND5E.CurrencyGP",
    abbreviation: "DND5E.CurrencyAbbrGP",
    conversion: 1
  },
  ep: {
    label: "DND5E.CurrencyEP",
    abbreviation: "DND5E.CurrencyAbbrEP",
    conversion: 2
  },
  sp: {
    label: "DND5E.CurrencySP",
    abbreviation: "DND5E.CurrencyAbbrSP",
    conversion: 10
  },
  cp: {
    label: "DND5E.CurrencyCP",
    abbreviation: "DND5E.CurrencyAbbrCP",
    conversion: 100
  }
};
preLocalize("currencies", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */
/*  Damage Types                                */
/* -------------------------------------------- */

/**
 * Types of damage that are considered physical.
 * @deprecated since DnD5e 3.0, available until DnD5e 3.2
 * @enum {string}
 */
DND5E.physicalDamageTypes = {
  bludgeoning: "DND5E.DamageBludgeoning",
  piercing: "DND5E.DamagePiercing",
  slashing: "DND5E.DamageSlashing"
};
preLocalize("physicalDamageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage the can be caused by abilities.
 * @enum {{label: string, [isPhysical]: boolean}}
 */
DND5E.damageTypes = {
  acid: {
    label: "DND5E.DamageAcid"
  },
  bludgeoning: {
    label: "DND5E.DamageBludgeoning",
    isPhysical: true
  },
  cold: {
    label: "DND5E.DamageCold"
  },
  fire: {
    label: "DND5E.DamageFire"
  },
  force: {
    label: "DND5E.DamageForce"
  },
  lightning: {
    label: "DND5E.DamageLightning"
  },
  necrotic: {
    label: "DND5E.DamageNecrotic"
  },
  piercing: {
    label: "DND5E.DamagePiercing",
    isPhysical: true
  },
  poison: {
    label: "DND5E.DamagePoison"
  },
  psychic: {
    label: "DND5E.DamagePsychic"
  },
  radiant: {
    label: "DND5E.DamageRadiant"
  },
  slashing: {
    label: "DND5E.DamageSlashing",
    isPhysical: true
  },
  thunder: {
    label: "DND5E.DamageThunder"
  }
};
patchConfig("damageTypes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });
preLocalize("damageTypes", { keys: ["label"], sort: true });

/* -------------------------------------------- */
/*  Movement                                    */
/* -------------------------------------------- */

/**
 * Different types of healing that can be applied using abilities.
 * @enum {string}
 */
DND5E.healingTypes = {
  healing: {
    label: "DND5E.Healing"
  },
  temphp: {
    label: "DND5E.HealingTemp"
  }
};
patchConfig("healingTypes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });
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
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
DND5E.movementUnits = {
  ft: "DND5E.DistFt",
  mi: "DND5E.DistMi",
  m: "DND5E.DistM",
  km: "DND5E.DistKm"
};
preLocalize("movementUnits");

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
  ...DND5E.movementUnits,
  ...DND5E.rangeTypes
};
preLocalize("distanceUnits");

/* -------------------------------------------- */

/**
 * Encumbrance configuration data.
 *
 * @typedef {object} EncumbranceConfiguration
 * @property {Record<string, number>} currencyPerWeight  Pieces of currency that equal a base weight (lbs or kgs).
 * @property {Record<string, object>} effects            Data used to create encumbrance-replated Active Effects.
 * @property {object} threshold                          Amount to multiply strength to get given capacity threshold.
 * @property {Record<string, number>} threshold.encumbered
 * @property {Record<string, number>} threshold.heavilyEncumbered
 * @property {Record<string, number>} threshold.maximum
 * @property {Record<string, number>} speedReduction     Speed reduction caused by encumbered status effects.
 * @property {Record<string, number>} vehicleWeightMultiplier  Multiplier used to determine vehicle carrying capacity.
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
      metric: 2.2
    },
    heavilyEncumbered: {
      imperial: 10,
      metric: 4.5
    },
    maximum: {
      imperial: 15,
      metric: 6.8
    }
  },
  speedReduction: {
    encumbered: 10,
    heavilyEncumbered: 20
  },
  vehicleWeightMultiplier: {
    imperial: 2000, // 2000 lbs in an imperial ton
    metric: 1000 // 1000 kg in a metric ton
  }
};
Object.defineProperty(DND5E.encumbrance, "strMultiplier", {
  get() {
    foundry.utils.logCompatibilityWarning(
      "`DND5E.encumbrance.strMultiplier` has been moved to `DND5E.encumbrance.threshold.maximum`.",
      { since: "DnD5e 3.0", until: "DnD5e 3.2" }
    );
    return this.threshold.maximum;
  }
});
preLocalize("encumbrance.effects", { key: "name" });

/* -------------------------------------------- */
/*  Targeting                                   */
/* -------------------------------------------- */

/**
 * Targeting types that apply to one or more distinct targets.
 * @enum {string}
 */
DND5E.individualTargetTypes = {
  self: "DND5E.TargetSelf",
  ally: "DND5E.TargetAlly",
  enemy: "DND5E.TargetEnemy",
  creature: "DND5E.TargetCreature",
  object: "DND5E.TargetObject",
  space: "DND5E.TargetSpace",
  creatureOrObject: "DND5E.TargetCreatureOrObject",
  any: "DND5E.TargetAny",
  willing: "DND5E.TargetWilling"
};
preLocalize("individualTargetTypes");

/* -------------------------------------------- */

/**
 * Information needed to represent different area of effect target types.
 *
 * @typedef {object} AreaTargetDefinition
 * @property {string} label     Localized label for this type.
 * @property {string} template  Type of `MeasuredTemplate` create for this target type.
 */

/**
 * Targeting types that cover an area.
 * @enum {AreaTargetDefinition}
 */
DND5E.areaTargetTypes = {
  radius: {
    label: "DND5E.TargetRadius",
    template: "circle"
  },
  sphere: {
    label: "DND5E.TargetSphere",
    template: "circle"
  },
  cylinder: {
    label: "DND5E.TargetCylinder",
    template: "circle"
  },
  cone: {
    label: "DND5E.TargetCone",
    template: "cone"
  },
  square: {
    label: "DND5E.TargetSquare",
    template: "rect"
  },
  cube: {
    label: "DND5E.TargetCube",
    template: "rect"
  },
  line: {
    label: "DND5E.TargetLine",
    template: "ray"
  },
  wall: {
    label: "DND5E.TargetWall",
    template: "ray"
  }
};
preLocalize("areaTargetTypes", { key: "label", sort: true });

/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
DND5E.targetTypes = {
  ...DND5E.individualTargetTypes,
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
 * Various different ways a spell can be prepared.
 */
DND5E.spellPreparationModes = {
  prepared: "DND5E.SpellPrepPrepared",
  pact: "DND5E.PactMagic",
  always: "DND5E.SpellPrepAlways",
  atwill: "DND5E.SpellPrepAtWill",
  innate: "DND5E.SpellPrepInnate"
};
preLocalize("spellPreparationModes");

/* -------------------------------------------- */

/**
 * Subset of `DND5E.spellPreparationModes` that consume spell slots.
 * @type {string[]}
 */
DND5E.spellUpcastModes = ["always", "pact", "prepared"];

/* -------------------------------------------- */

/**
 * Configuration data for different types of spellcasting supported.
 *
 * @typedef {object} SpellcastingTypeConfiguration
 * @property {string} label                                                        Localized label.
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
    progression: {
      full: {
        label: "DND5E.SpellProgFull",
        divisor: 1
      },
      half: {
        label: "DND5E.SpellProgHalf",
        divisor: 2
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
    label: "DND5E.SpellProgPact"
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
 * Types of components that can be required when casting a spell.
 * @enum {object}
 */
DND5E.spellComponents = {
  vocal: {
    label: "DND5E.ComponentVerbal",
    abbr: "DND5E.ComponentVerbalAbbr"
  },
  somatic: {
    label: "DND5E.ComponentSomatic",
    abbr: "DND5E.ComponentSomaticAbbr"
  },
  material: {
    label: "DND5E.ComponentMaterial",
    abbr: "DND5E.ComponentMaterialAbbr"
  }
};
preLocalize("spellComponents", {keys: ["label", "abbr"]});

/* -------------------------------------------- */

/**
 * Supplementary rules keywords that inform a spell's use.
 * @enum {object}
 */
DND5E.spellTags = {
  concentration: {
    label: "DND5E.Concentration",
    abbr: "DND5E.ConcentrationAbbr"
  },
  ritual: {
    label: "DND5E.Ritual",
    abbr: "DND5E.RitualAbbr"
  }
};
preLocalize("spellTags", {keys: ["label", "abbr"]});

/* -------------------------------------------- */

/**
 * Schools to which a spell can belong.
 * @enum {string}
 */
DND5E.spellSchools = {
  abj: "DND5E.SchoolAbj",
  con: "DND5E.SchoolCon",
  div: "DND5E.SchoolDiv",
  enc: "DND5E.SchoolEnc",
  evo: "DND5E.SchoolEvo",
  ill: "DND5E.SchoolIll",
  nec: "DND5E.SchoolNec",
  trs: "DND5E.SchoolTrs"
};
preLocalize("spellSchools", { sort: true });

/* -------------------------------------------- */

/**
 * Spell scroll item ID within the `DND5E.sourcePacks` compendium for each level.
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
 * A subset of weapon properties that determine the physical characteristics of the weapon.
 * These properties are used for determining physical resistance bypasses.
 * @deprecated since DnD5e 3.0, available until DnD5e 3.2
 * @enum {string}
 */
DND5E.physicalWeaponProperties = {
  ada: "DND5E.WeaponPropertiesAda",
  mgc: "DND5E.WeaponPropertiesMgc",
  sil: "DND5E.WeaponPropertiesSil"
};
preLocalize("physicalWeaponProperties", { sort: true });

/* -------------------------------------------- */

/**
 * The set of weapon property flags which can exist on a weapon.
 * @deprecated since DnD5e 3.0, available until DnD5e 3.2
 * @enum {string}
 */
DND5E.weaponProperties = {
  ...DND5E.physicalWeaponProperties,
  amm: "DND5E.WeaponPropertiesAmm",
  fin: "DND5E.WeaponPropertiesFin",
  fir: "DND5E.WeaponPropertiesFir",
  foc: "DND5E.WeaponPropertiesFoc",
  hvy: "DND5E.WeaponPropertiesHvy",
  lgt: "DND5E.WeaponPropertiesLgt",
  lod: "DND5E.WeaponPropertiesLod",
  rch: "DND5E.WeaponPropertiesRch",
  rel: "DND5E.WeaponPropertiesRel",
  ret: "DND5E.WeaponPropertiesRet",
  spc: "DND5E.WeaponPropertiesSpc",
  thr: "DND5E.WeaponPropertiesThr",
  two: "DND5E.WeaponPropertiesTwo",
  ver: "DND5E.WeaponPropertiesVer"
};
preLocalize("weaponProperties", { sort: true });

/* -------------------------------------------- */

/**
 * Compendium packs used for localized items.
 * @enum {string}
 */
DND5E.sourcePacks = {
  ITEMS: "dnd5e.items"
};

/* -------------------------------------------- */

/**
 * Settings to configure how actors are merged when polymorphing is applied.
 * @enum {string}
 */
DND5E.polymorphSettings = {
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
  keepVision: "DND5E.PolymorphKeepVision",
  keepSelf: "DND5E.PolymorphKeepSelf"
};
preLocalize("polymorphSettings", { sort: true });

/**
 * Settings to configure how actors are effects are merged when polymorphing is applied.
 * @enum {string}
 */
DND5E.polymorphEffectSettings = {
  keepAE: "DND5E.PolymorphKeepAE",
  keepOtherOriginAE: "DND5E.PolymorphKeepOtherOriginAE",
  keepOriginAE: "DND5E.PolymorphKeepOriginAE",
  keepEquipmentAE: "DND5E.PolymorphKeepEquipmentAE",
  keepFeatAE: "DND5E.PolymorphKeepFeatureAE",
  keepSpellAE: "DND5E.PolymorphKeepSpellAE",
  keepClassAE: "DND5E.PolymorphKeepClassAE",
  keepBackgroundAE: "DND5E.PolymorphKeepBackgroundAE"
};
preLocalize("polymorphEffectSettings", { sort: true });

/**
 * Settings to configure how actors are merged when preset polymorphing is applied.
 * @enum {object}
 */
DND5E.transformationPresets = {
  wildshape: {
    icon: '<i class="fas fa-paw"></i>',
    label: "DND5E.PolymorphWildShape",
    options: {
      keepBio: true,
      keepClass: true,
      keepMental: true,
      mergeSaves: true,
      mergeSkills: true,
      keepEquipmentAE: false
    }
  },
  polymorph: {
    icon: '<i class="fas fa-pastafarianism"></i>',
    label: "DND5E.Polymorph",
    options: {
      keepEquipmentAE: false,
      keepClassAE: false,
      keepFeatAE: false,
      keepBackgroundAE: false
    }
  },
  polymorphSelf: {
    icon: '<i class="fas fa-eye"></i>',
    label: "DND5E.PolymorphSelf",
    options: {
      keepSelf: true
    }
  }
};
preLocalize("transformationPresets", { sort: true, keys: ["label"] });

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
  "attributes.ac.value", "attributes.init.bonus", "attributes.movement", "attributes.senses", "attributes.spelldc",
  "attributes.spellLevel", "details.cr", "details.spellLevel", "details.xp.value", "skills.*.passive",
  "abilities.*.value"
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
 * Configuration data for system conditions.
 *
 * @typedef {object} ConditionConfiguration
 * @property {string} label        Localized label for the condition.
 * @property {string} [icon]       Icon used to represent the condition on the token.
 * @property {string} [reference]  UUID of a journal entry with details on this condition.
 * @property {string} [special]    Set this condition as a special status effect under this name.
 */

/**
 * Conditions that can affect an actor.
 * @enum {ConditionConfiguration}
 */
DND5E.conditionTypes = {
  blinded: {
    label: "DND5E.ConBlinded",
    icon: "systems/dnd5e/icons/svg/statuses/blinded.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.0b8N4FymGGfbZGpJ",
    special: "BLIND"
  },
  charmed: {
    label: "DND5E.ConCharmed",
    icon: "systems/dnd5e/icons/svg/statuses/charmed.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.zZaEBrKkr66OWJvD"
  },
  deafened: {
    label: "DND5E.ConDeafened",
    icon: "systems/dnd5e/icons/svg/statuses/deafened.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.6G8JSjhn701cBITY"
  },
  diseased: {
    label: "DND5E.ConDiseased",
    icon: "icons/svg/biohazard.svg"
  },
  exhaustion: {
    label: "DND5E.ConExhaustion",
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.cspWveykstnu3Zcv"
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
  stunned: {
    label: "DND5E.ConStunned",
    icon: "systems/dnd5e/icons/svg/statuses/stunned.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.ZyZMUwA2rboh4ObS",
    statuses: ["incapacitated"]
  },
  unconscious: {
    label: "DND5E.ConUnconscious",
    icon: "systems/dnd5e/icons/svg/statuses/unconscious.svg",
    reference: "Compendium.dnd5e.rules.JournalEntry.w7eitkpD7QQTB6j0.JournalEntryPage.UWw13ISmMxDzmwbd",
    statuses: ["incapacitated", "prone"]
  }
};
preLocalize("conditionTypes", { key: "label", sort: true });
patchConfig("conditionTypes", "label", { since: "DnD5e 3.0", until: "DnD5e 3.2" });

/* -------------------------------------------- */

/**
 * Extra status effects not specified in `conditionTypes`. If the ID matches a core-provided effect, then this
 * data will be merged into the core data.
 * @enum {object}
 */
DND5E.statusEffects = {
  bleeding: {
    icon: "systems/dnd5e/icons/svg/statuses/bleeding.svg"
  },
  burrowing: {
    name: "EFFECT.DND5E.StatusBurrowing",
    icon: "icons/svg/cave.svg"
  },
  concentrating: {
    name: "EFFECT.DND5E.StatusConcentrating",
    icon: "systems/dnd5e/icons/svg/statuses/concentrating.svg"
  },
  curse: {},
  dead: {
    icon: "systems/dnd5e/icons/svg/statuses/dead.svg"
  },
  fly: {},
  hidden: {
    name: "EFFECT.DND5E.StatusHidden",
    icon: "icons/svg/cowled.svg"
  },
  marked: {
    name: "EFFECT.DND5E.StatusMarked",
    icon: "systems/dnd5e/icons/svg/statuses/marked.svg"
  },
  silence: {
    icon: "systems/dnd5e/icons/svg/statuses/silenced.svg"
  },
  sleep: {
    name: "EFFECT.DND5E.StatusSleeping"
  },
  surprised: {
    name: "EFFECT.DND5E.StatusSurprised",
    icon: "systems/dnd5e/icons/svg/statuses/surprised.svg"
  },
  transformed: {
    name: "EFFECT.DND5E.StatusTransformed",
    icon: "icons/svg/pawprint.svg"
  }
};

/* -------------------------------------------- */
/*  Languages                                   */
/* -------------------------------------------- */

/**
 * Languages a character can learn.
 * @enum {string}
 */
DND5E.languages = {
  standard: {
    label: "DND5E.LanguagesStandard",
    children: {
      common: "DND5E.LanguagesCommon",
      dwarvish: "DND5E.LanguagesDwarvish",
      elvish: "DND5E.LanguagesElvish",
      giant: "DND5E.LanguagesGiant",
      gnomish: "DND5E.LanguagesGnomish",
      goblin: "DND5E.LanguagesGoblin",
      halfling: "DND5E.LanguagesHalfling",
      orc: "DND5E.LanguagesOrc"
    }
  },
  exotic: {
    label: "DND5E.LanguagesExotic",
    children: {
      aarakocra: "DND5E.LanguagesAarakocra",
      abyssal: "DND5E.LanguagesAbyssal",
      celestial: "DND5E.LanguagesCelestial",
      deep: "DND5E.LanguagesDeepSpeech",
      draconic: "DND5E.LanguagesDraconic",
      gith: "DND5E.LanguagesGith",
      gnoll: "DND5E.LanguagesGnoll",
      infernal: "DND5E.LanguagesInfernal",
      primordial: {
        label: "DND5E.LanguagesPrimordial",
        children: {
          aquan: "DND5E.LanguagesAquan",
          auran: "DND5E.LanguagesAuran",
          ignan: "DND5E.LanguagesIgnan",
          terran: "DND5E.LanguagesTerran"
        }
      },
      sylvan: "DND5E.LanguagesSylvan",
      undercommon: "DND5E.LanguagesUndercommon"
    }
  },
  druidic: "DND5E.LanguagesDruidic",
  cant: "DND5E.LanguagesThievesCant"
};
preLocalize("languages", { key: "label" });
preLocalize("languages.standard.children", { sort: true });
preLocalize("languages.exotic.children", { key: "label", sort: true });
preLocalize("languages.exotic.children.primordial.children", { sort: true });
patchConfig("languages", "label", { since: "DnD5e 2.4", until: "DnD5e 3.1" });

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

/* -------------------------------------------- */

/**
 * Trait configuration information.
 *
 * @typedef {object} TraitConfiguration
 * @property {object} labels
 * @property {string} labels.title         Localization key for the trait name.
 * @property {string} labels.localization  Prefix for a localization key that can be used to generate various
 *                                         plural variants of the trait type.
 * @property {string} icon                 Path to the icon used to represent this trait.
 * @property {string} [actorKeyPath]       If the trait doesn't directly map to an entry as `traits.[key]`, where is
 *                                         this trait's data stored on the actor?
 * @property {string} [configKey]          If the list of trait options doesn't match the name of the trait, where can
 *                                         the options be found within `CONFIG.DND5E`?
 * @property {string} [labelKeyPath]       If config is an enum of objects, where can the label be found?
 * @property {object} [subtypes]           Configuration for traits that take some sort of base item.
 * @property {string} [subtypes.keyPath]   Path to subtype value on base items, should match a category key.
 *                                         Deprecated in favor of the standardized `system.type.value`.
 * @property {string[]} [subtypes.ids]     Key for base item ID objects within `CONFIG.DND5E`.
 * @property {object} [children]           Mapping of category key to an object defining its children.
 * @property {boolean} [sortCategories]    Whether top-level categories should be sorted.
 * @property {boolean} [expertise]         Can an actor receive expertise in this trait?
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
    icon: "systems/dnd5e/icons/svg/trait-saves.svg",
    actorKeyPath: "system.abilities",
    configKey: "abilities",
    labelKeyPath: "label"
  },
  skills: {
    labels: {
      title: "DND5E.Skills",
      localization: "DND5E.TraitSkillsPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-skills.svg",
    actorKeyPath: "system.skills",
    labelKeyPath: "label",
    expertise: true
  },
  languages: {
    labels: {
      title: "DND5E.Languages",
      localization: "DND5E.TraitLanguagesPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-languages.svg"
  },
  armor: {
    labels: {
      title: "DND5E.TraitArmorProf",
      localization: "DND5E.TraitArmorPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-armor-proficiencies.svg",
    actorKeyPath: "system.traits.armorProf",
    configKey: "armorProficiencies",
    subtypes: { keyPath: "armor.type", ids: ["armorIds", "shieldIds"] }
  },
  weapon: {
    labels: {
      title: "DND5E.TraitWeaponProf",
      localization: "DND5E.TraitWeaponPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-weapon-proficiencies.svg",
    actorKeyPath: "system.traits.weaponProf",
    configKey: "weaponProficiencies",
    subtypes: { keyPath: "weaponType", ids: ["weaponIds"] }
  },
  tool: {
    labels: {
      title: "DND5E.TraitToolProf",
      localization: "DND5E.TraitToolPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-tool-proficiencies.svg",
    actorKeyPath: "system.tools",
    configKey: "toolProficiencies",
    subtypes: { keyPath: "toolType", ids: ["toolIds"] },
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
  ci: {
    labels: {
      title: "DND5E.ConImm",
      localization: "DND5E.TraitCIPlural"
    },
    icon: "systems/dnd5e/icons/svg/trait-condition-immunities.svg",
    configKey: "conditionTypes"
  }
};
preLocalize("traits", { key: "labels.title" });

/* -------------------------------------------- */

/**
 * Modes used within a trait advancement.
 * @enum {object}
 */
DND5E.traitModes = {
  default: {
    label: "DND5E.AdvancementTraitModeDefaultLabel",
    hint: "DND5E.AdvancementTraitModeDefaultHint"
  },
  expertise: {
    label: "DND5E.AdvancementTraitModeExpertiseLabel",
    hint: "DND5E.AdvancementTraitModeExpertiseHint"
  },
  forcedExpertise: {
    label: "DND5E.AdvancementTraitModeForceLabel",
    hint: "DND5E.AdvancementTraitModeForceHint"
  },
  upgrade: {
    label: "DND5E.AdvancementTraitModeUpgradeLabel",
    hint: "DND5E.AdvancementTraitModeUpgradeHint"
  }
};
preLocalize("traitModes", { keys: ["label", "hint"] });

/* -------------------------------------------- */

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
 * Advancement types that can be added to items.
 * @enum {*}
 */
DND5E.advancementTypes = {
  AbilityScoreImprovement: advancement.AbilityScoreImprovementAdvancement,
  HitPoints: advancement.HitPointsAdvancement,
  ItemChoice: advancement.ItemChoiceAdvancement,
  ItemGrant: advancement.ItemGrantAdvancement,
  ScaleValue: advancement.ScaleValueAdvancement,
  Size: advancement.SizeAdvancement,
  Trait: advancement.TraitAdvancement
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
    label: "DND5E.Rule.TypeRule",
    references: "rules"
  },
  ability: {
    label: "DND5E.Ability",
    references: "enrichmentLookup.abilities"
  },
  condition: {
    label: "DND5E.Rule.TypeCondition",
    references: "conditionTypes"
  },
  skill: {
    label: "DND5E.Skill",
    references: "enrichmentLookup.skills"
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
  difficultterrain: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.hFW5BR2yHHwwgurD",
  climbing: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KxUXbMrUCIAhv4AF",
  swimming: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KxUXbMrUCIAhv4AF",
  crawling: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.KxUXbMrUCIAhv4AF",
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
  truesight: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.kNa8rJFbtaTM3Rmk",
  food: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.jayo7XVgGnRCpTW0",
  water: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.iIEI87J7lr2sqtb5",
  resting: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.dpHJXYLigIdEseIb",
  shortrest: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.1s2swI3UsjUUgbt2",
  longrest: "Compendium.dnd5e.rules.JournalEntry.NizgRXLNUqtdlC1s.JournalEntryPage.6cLtjbHn4KV2R7G9"
};

/* -------------------------------------------- */
/*  Sources                                     */
/* -------------------------------------------- */

/**
 * List of books available as sources.
 * @enum {string}
 */
DND5E.sourceBooks = {
  "SRD 5.1": "SOURCE.BOOK.SRD"
};
preLocalize("sourceBooks", { sort: true });

/* -------------------------------------------- */
/*  Enrichment                                  */
/* -------------------------------------------- */

let _enrichmentLookup;
Object.defineProperty(DND5E, "enrichmentLookup", {
  get() {
    const s = value => value?.slugify().replaceAll("-", "");
    if ( !_enrichmentLookup ) {
      _enrichmentLookup = {
        abilities: foundry.utils.deepClone(DND5E.abilities),
        skills: foundry.utils.deepClone(DND5E.skills),
        tools: foundry.utils.deepClone(DND5E.toolIds)
      };
      Object.entries(DND5E.abilities).forEach(([k, a]) => _enrichmentLookup.abilities[s(a.fullKey)] = { ...a, key: k });
      Object.entries(DND5E.skills).forEach(([k, s]) => _enrichmentLookup.skills[s(s.fullKey)] = { ...s, key: k });
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
    o.toString = toString;
  });
}

/* -------------------------------------------- */

export default DND5E;
