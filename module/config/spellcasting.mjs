import { preLocalize } from "./utils.mjs";

/* -------------------------------------------- */
/*  Spellcasting                                */
/* -------------------------------------------- */

/**
 * Various different ways a spell can be prepared.
 * @enum {string}
 */
export const spellPreparationModes = {
  prepared: "DND5E.SpellPrepPrepared",
  pact: "DND5E.PactMagic",
  always: "DND5E.SpellPrepAlways",
  atwill: "DND5E.SpellPrepAtWill",
  innate: "DND5E.SpellPrepInnate"
};
preLocalize("spellPreparationModes");

/* -------------------------------------------- */

/**
 * Ways in which a class can contribute to spellcasting levels.
 * @enum {string}
 */
export const spellProgression = {
  none: "DND5E.SpellNone",
  full: "DND5E.SpellProgFull",
  half: "DND5E.SpellProgHalf",
  third: "DND5E.SpellProgThird",
  pact: "DND5E.SpellProgPact",
  artificer: "DND5E.SpellProgArt"
};
preLocalize("spellProgression");

/* -------------------------------------------- */

/**
 * The available choices for how spell damage scaling may be computed.
 * @enum {string}
 */
export const spellScalingModes = {
  none: "DND5E.SpellNone",
  cantrip: "DND5E.SpellCantrip",
  level: "DND5E.SpellLevel"
};
preLocalize("spellScalingModes", { sort: true });

/* -------------------------------------------- */

/**
 * Define the standard slot progression by character level.
 * The entries of this array represent the spell slot progression for a full spell-caster.
 * @type {number[][]}
 */
export const SPELL_SLOT_TABLE = [
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
 * Subset of `DND5E.spellPreparationModes` that consume spell slots.
 * @type {boolean[]}
 */
export const spellUpcastModes = ["always", "pact", "prepared"];

/* -------------------------------------------- */
/*  Spell Details                               */
/* -------------------------------------------- */

/**
 * Types of components that can be required when casting a spell.
 * @enum {object}
 */
export const spellComponents = {
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
export const spellTags = {
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
export const spellSchools = {
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
 * Valid spell levels.
 * @enum {string}
 */
export const spellLevels = {
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
