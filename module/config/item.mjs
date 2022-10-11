import { preLocalize } from "./utils.mjs";

/**
 * The valid currency denominations with localized labels, abbreviations, and conversions.
 * @enum {{
 *   label: string,
 *   abbreviation: string,
 *   [conversion]: {into: string, each: number}
 * }}
 */
export const currencies = {
  pp: {
    label: "DND5E.CurrencyPP",
    abbreviation: "DND5E.CurrencyAbbrPP"
  },
  gp: {
    label: "DND5E.CurrencyGP",
    abbreviation: "DND5E.CurrencyAbbrGP",
    conversion: {into: "pp", each: 10}
  },
  ep: {
    label: "DND5E.CurrencyEP",
    abbreviation: "DND5E.CurrencyAbbrEP",
    conversion: {into: "gp", each: 2}
  },
  sp: {
    label: "DND5E.CurrencySP",
    abbreviation: "DND5E.CurrencyAbbrSP",
    conversion: {into: "ep", each: 5}
  },
  cp: {
    label: "DND5E.CurrencyCP",
    abbreviation: "DND5E.CurrencyAbbrCP",
    conversion: {into: "sp", each: 10}
  }
};
preLocalize("currencies", { keys: ["label", "abbreviation"] });

/* -------------------------------------------- */

/**
 * Classification types for item action types.
 * @enum {string}
 */
export const itemActionTypes = {
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
export const itemCapacityTypes = {
  items: "DND5E.ItemContainerCapacityItems",
  weight: "DND5E.ItemContainerCapacityWeight"
};
preLocalize("itemCapacityTypes", { sort: true });

/* -------------------------------------------- */

/**
 * List of various item rarities.
 * @enum {string}
 */
export const itemRarity = {
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
 * Compendium packs used for localized items.
 * @enum {string}
 */
export const sourcePacks = {
  ITEMS: "dnd5e.items"
};

/* -------------------------------------------- */
/*  Armor                                       */
/* -------------------------------------------- */

/**
 * Specific equipment types that modify base AC.
 * @enum {string}
 */
export const armorTypes = {
  light: "DND5E.EquipmentLight",
  medium: "DND5E.EquipmentMedium",
  heavy: "DND5E.EquipmentHeavy",
  natural: "DND5E.EquipmentNatural",
  shield: "DND5E.EquipmentShield"
};
preLocalize("armorTypes");

/* -------------------------------------------- */

/**
 * The set of Armor Proficiencies which a character may have.
 * @type {object}
 */
export const armorProficiencies = {
  lgt: armorTypes.light,
  med: armorTypes.medium,
  hvy: armorTypes.heavy,
  shl: "DND5E.EquipmentShieldProficiency"
};
preLocalize("armorProficiencies");

/* -------------------------------------------- */

/**
 * A mapping between `DND5E.equipmentTypes` and `DND5E.armorProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
export const armorProficienciesMap = {
  natural: true,
  clothing: true,
  light: "lgt",
  medium: "med",
  heavy: "hvy",
  shield: "shl"
};

/* -------------------------------------------- */

/**
 * The basic armor types in 5e. This enables specific armor proficiencies,
 * automated AC calculation in NPCs, and starting equipment.
 * @enum {string}
 */
export const armorIds = {
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

/* -------------------------------------------- */

/**
 * The basic shield in 5e.
 * @enum {string}
 */
export const shieldIds = {
  shield: "sSs3hSzkKBMNBgTs"
};

/* -------------------------------------------- */

/**
 * Common armor class calculations.
 * @enum {{ label: string, [formula]: string }}
 */
export const armorClasses = {
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
/*  Consumables                                 */
/* -------------------------------------------- */

/**
 * Enumerate the valid consumable types which are recognized by the system.
 * @enum {string}
 */
export const consumableTypes = {
  ammo: "DND5E.ConsumableAmmunition",
  potion: "DND5E.ConsumablePotion",
  poison: "DND5E.ConsumablePoison",
  food: "DND5E.ConsumableFood",
  scroll: "DND5E.ConsumableScroll",
  wand: "DND5E.ConsumableWand",
  rod: "DND5E.ConsumableRod",
  trinket: "DND5E.ConsumableTrinket"
};
preLocalize("consumableTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Spell scroll item ID within the `DND5E.sourcePacks` compendium for each level.
 * @enum {string}
 */
export const spellScrollIds = {
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
/*  Equipment                                   */
/* -------------------------------------------- */

/**
 * Equipment types that aren't armor.
 * @enum {string}
 */
export const miscEquipmentTypes = {
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
export const equipmentTypes = {
  ...miscEquipmentTypes,
  ...armorTypes
};
preLocalize("equipmentTypes", { sort: true });

/* -------------------------------------------- */
/*  Tools                                       */
/* -------------------------------------------- */

/**
 * The categories into which Tool items can be grouped.
 * @enum {string}
 */
export const toolTypes = {
  art: "DND5E.ToolArtisans",
  game: "DND5E.ToolGamingSet",
  music: "DND5E.ToolMusicalInstrument"
};
preLocalize("toolTypes", { sort: true });

/* -------------------------------------------- */

/**
 * The categories of tool proficiencies that a character can gain.
 *
 * @enum {string}
 */
export const toolProficiencies = {
  ...toolTypes,
  vehicle: "DND5E.ToolVehicle"
};
preLocalize("toolProficiencies", { sort: true });

/* -------------------------------------------- */

/**
 * The basic tool types in 5e. This enables specific tool proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
export const toolIds = {
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
 * The various types of vehicles in which characters can be proficient.
 * @enum {string}
 */
export const vehicleTypes = {
  air: "DND5E.VehicleTypeAir",
  land: "DND5E.VehicleTypeLand",
  space: "DND5E.VehicleTypeSpace",
  water: "DND5E.VehicleTypeWater"
};
preLocalize("vehicleTypes", { sort: true });

/* -------------------------------------------- */
/*  Weapons                                     */
/* -------------------------------------------- */

/**
 * The set of types which a weapon item can take.
 * @enum {string}
 */
export const weaponTypes = {
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
export const weaponProficiencies = {
  sim: "DND5E.WeaponSimpleProficiency",
  mar: "DND5E.WeaponMartialProficiency"
};
preLocalize("weaponProficiencies");

/* -------------------------------------------- */

/**
 * A mapping between `DND5E.weaponTypes` and `DND5E.weaponProficiencies` that
 * is used to determine if character has proficiency when adding an item.
 * @enum {(boolean|string)}
 */
export const weaponProficienciesMap = {
  natural: true,
  simpleM: "sim",
  simpleR: "sim",
  martialM: "mar",
  martialR: "mar"
};

/* -------------------------------------------- */

/**
 * The basic weapon types in 5e. This enables specific weapon proficiencies or
 * starting equipment provided by classes and backgrounds.
 * @enum {string}
 */
export const weaponIds = {
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
 * A subset of weapon properties that determine the physical characteristics of the weapon.
 * These properties are used for determining physical resistance bypasses.
 * @enum {string}
 */
export const physicalWeaponProperties = {
  ada: "DND5E.WeaponPropertiesAda",
  mgc: "DND5E.WeaponPropertiesMgc",
  sil: "DND5E.WeaponPropertiesSil"
};
preLocalize("physicalWeaponProperties", { sort: true });

/* -------------------------------------------- */

/**
 * The set of weapon property flags which can exist on a weapon.
 * @enum {string}
 */
export const weaponProperties = {
  ...physicalWeaponProperties,
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
