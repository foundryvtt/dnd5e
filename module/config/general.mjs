import { patchConfig, preLocalize } from "./utils.mjs";

/* -------------------------------------------- */
/*  Attunement & Proficiency                    */
/* -------------------------------------------- */

/**
 * An enumeration of item attunement types.
 * @enum {number}
 */
export const attunementTypes = {
  NONE: 0,
  REQUIRED: 1,
  ATTUNED: 2
};

/* -------------------------------------------- */

/**
 * An enumeration of item attunement states.
 * @type {{"0": string, "1": string, "2": string}}
 */
export const attunements = {
  0: "DND5E.AttunementNone",
  1: "DND5E.AttunementRequired",
  2: "DND5E.AttunementAttuned"
};
preLocalize("attunements");

/* -------------------------------------------- */

/**
 * Skill, ability, and tool proficiency levels.
 * The key for each level represents its proficiency multiplier.
 * @enum {string}
 */
export const proficiencyLevels = {
  0: "DND5E.NotProficient",
  1: "DND5E.Proficient",
  0.5: "DND5E.HalfProficient",
  2: "DND5E.Expertise"
};
preLocalize("proficiencyLevels");

/* -------------------------------------------- */
/*  Consumption                                 */
/* -------------------------------------------- */

/**
 * Different things that an ability can consume upon use.
 * @enum {string}
 */
export const abilityConsumptionTypes = {
  ammo: "DND5E.ConsumeAmmunition",
  attribute: "DND5E.ConsumeAttribute",
  hitDice: "DND5E.ConsumeHitDice",
  material: "DND5E.ConsumeMaterial",
  charges: "DND5E.ConsumeCharges"
};
preLocalize("abilityConsumptionTypes", { sort: true });

/* -------------------------------------------- */
/*  Damage & Healing                            */
/* -------------------------------------------- */

/**
 * Types of damage that are considered physical.
 * @enum {string}
 */
export const physicalDamageTypes = {
  bludgeoning: "DND5E.DamageBludgeoning",
  piercing: "DND5E.DamagePiercing",
  slashing: "DND5E.DamageSlashing"
};
preLocalize("physicalDamageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage the can be caused by abilities.
 * @enum {string}
 */
export const damageTypes = {
  ...physicalDamageTypes,
  acid: "DND5E.DamageAcid",
  cold: "DND5E.DamageCold",
  fire: "DND5E.DamageFire",
  force: "DND5E.DamageForce",
  lightning: "DND5E.DamageLightning",
  necrotic: "DND5E.DamageNecrotic",
  poison: "DND5E.DamagePoison",
  psychic: "DND5E.DamagePsychic",
  radiant: "DND5E.DamageRadiant",
  thunder: "DND5E.DamageThunder"
};
preLocalize("damageTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Types of damage to which an actor can possess resistance, immunity, or vulnerability.
 * @enum {string}
 * @deprecated
 */
export const damageResistanceTypes = {
  ...damageTypes,
  physical: "DND5E.DamagePhysical"
};
preLocalize("damageResistanceTypes", { sort: true });

/* -------------------------------------------- */

/**
 * Different types of healing that can be applied using abilities.
 * @enum {string}
 */
export const healingTypes = {
  healing: "DND5E.Healing",
  temphp: "DND5E.HealingTemp"
};
preLocalize("healingTypes");

/* -------------------------------------------- */
/*  Distance                                    */
/* -------------------------------------------- */

/**
 * The valid units of measure for movement distances in the game system.
 * By default this uses the imperial units of feet and miles.
 * @enum {string}
 */
export const movementUnits = {
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
export const rangeTypes = {
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
export const distanceUnits = {
  none: "DND5E.None",
  ...movementUnits,
  ...rangeTypes
};
preLocalize("distanceUnits");

/* -------------------------------------------- */
/*  Time                                        */
/* -------------------------------------------- */

/**
 * The various lengths of time over which effects can occur.
 * @enum {string}
 */
export const timePeriods = {
  inst: "DND5E.TimeInst",
  turn: "DND5E.TimeTurn",
  round: "DND5E.TimeRound",
  minute: "DND5E.TimeMinute",
  hour: "DND5E.TimeHour",
  day: "DND5E.TimeDay",
  month: "DND5E.TimeMonth",
  year: "DND5E.TimeYear",
  perm: "DND5E.TimePerm",
  spec: "DND5E.Special"
};
preLocalize("timePeriods");

/* -------------------------------------------- */

/**
 * Various ways in which an item or ability can be activated.
 * @enum {string}
 */
export const abilityActivationTypes = {
  none: "DND5E.None",
  action: "DND5E.Action",
  bonus: "DND5E.BonusAction",
  reaction: "DND5E.Reaction",
  minute: timePeriods.minute,
  hour: timePeriods.hour,
  day: timePeriods.day,
  special: timePeriods.spec,
  legendary: "DND5E.LegendaryActionLabel",
  lair: "DND5E.LairActionLabel",
  crew: "DND5E.VehicleCrewAction"
};
preLocalize("abilityActivationTypes");

/* -------------------------------------------- */

/**
 * Enumerate the lengths of time over which an item can have limited use ability.
 * @enum {string}
 */
export const limitedUsePeriods = {
  sr: "DND5E.ShortRest",
  lr: "DND5E.LongRest",
  day: "DND5E.Day",
  charges: "DND5E.Charges"
};
preLocalize("limitedUsePeriods");

/* -------------------------------------------- */
/*  Targeting                                   */
/* -------------------------------------------- */

/**
 * Targeting types that apply to one or more distinct targets.
 * @enum {string}
 */
export const individualTargetTypes = {
  self: "DND5E.TargetSelf",
  ally: "DND5E.TargetAlly",
  enemy: "DND5E.TargetEnemy",
  creature: "DND5E.TargetCreature",
  object: "DND5E.TargetObject",
  space: "DND5E.TargetSpace"
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
export const areaTargetTypes = {
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
patchConfig("areaTargetTypes", areaTargetTypes, "template", { since: 2.0, until: 2.2 });

/* -------------------------------------------- */

/**
 * The types of single or area targets which can be applied to abilities.
 * @enum {string}
 */
export const targetTypes = {
  none: "DND5E.None",
  ...individualTargetTypes,
  ...Object.fromEntries(Object.entries(areaTargetTypes).map(([k, v]) => [k, v.label]))
};
preLocalize("targetTypes", { sort: true });
