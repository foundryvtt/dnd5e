const { OperatorTerm } = foundry.dice.terms;

/* -------------------------------------------- */
/* D20 Roll                                     */
/* -------------------------------------------- */

/**
 * Configuration data for a D20 roll.
 *
 * @typedef {object} DeprecatedD20RollConfiguration
 *
 * @property {string[]} [parts=[]]  The dice roll component parts, excluding the initial d20.
 * @property {object} [data={}]     Data that will be used when parsing this roll.
 * @property {Event} [event]        The triggering event for this roll.
 *
 * ## D20 Properties
 * @property {boolean} [advantage]     Apply advantage to this roll (unless overridden by modifier keys or dialog)?
 * @property {boolean} [disadvantage]  Apply disadvantage to this roll (unless overridden by modifier keys or dialog)?
 * @property {number|null} [critical=20]  The value of the d20 result which represents a critical success,
 *                                     `null` will prevent critical successes.
 * @property {number|null} [fumble=1]  The value of the d20 result which represents a critical failure,
 *                                     `null` will prevent critical failures.
 * @property {number} [targetValue]    The value of the d20 result which should represent a successful roll.
 * @property {string|false} [ammunition]  Ammunition to use with an attack roll.
 * @property {string} [attackMode]     Default attack mode to use with an attack roll.
 * @property {string} [mastery]        Weapon mastery to use with an attack roll.
 *
 * ## Flags
 * @property {boolean} [elvenAccuracy]   Allow Elven Accuracy to modify this roll?
 * @property {boolean} [halflingLucky]   Allow Halfling Luck to modify this roll?
 * @property {boolean} [reliableTalent]  Allow Reliable Talent to modify this roll?
 *
 * ## Roll Configuration Dialog
 * @property {boolean} [fastForward]             Should the roll configuration dialog be skipped?
 * @property {FormSelectOption[]} [ammunitionOptions]  Options for ammunition to use with an attack.
 * @property {FormSelectOption[]} [attackModes]  Modes that can be used when making an attack.
 * @property {boolean} [chooseModifier=false]    If the configuration dialog is shown, should the ability modifier be
 *                                               configurable within that interface?
 * @property {FormSelectOption[]} [masteryOptions]  Weapon masteries that can be selected when making an attack.
 * @property {string} [template]                 The HTML template used to display the roll configuration dialog.
 * @property {string} [title]                    Title of the roll configuration dialog.
 * @property {object} [dialogOptions]            Additional options passed to the roll configuration dialog.
 *
 * ## Chat Message
 * @property {boolean} [chatMessage=true]  Should a chat message be created for this roll?
 * @property {object} [messageData={}]     Additional data which is applied to the created chat message.
 * @property {string} [rollMode]           Value of `CONST.DICE_ROLL_MODES` to apply as default for the chat message.
 * @property {object} [flavor]             Flavor text to use in the created chat message.
 */

/**
 * A standardized helper function for managing core 5e d20 rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
 *
 * @param {DeprecatedD20RollConfiguration} configuration  Configuration data for the D20 roll.
 * @returns {Promise<D20Roll|null>}             The evaluated D20Roll, or null if the workflow was cancelled.
 */
export async function d20Roll({
  parts=[], data={}, event,
  advantage, disadvantage, critical=20, fumble=1, targetValue, attackMode, ammunition, mastery,
  elvenAccuracy, halflingLucky, reliableTalent,
  fastForward, ammunitionOptions, attackModes, chooseModifier=false, masteryOptions, template, title, dialogOptions,
  chatMessage=true, messageData={}, rollMode, flavor
}={}) {
  foundry.utils.logCompatibilityWarning(
    "The `d20Roll` standalone method has been deprecated and replaced with `CONFIG.Dice.D20Roll.build`.",
    { since: "DnD5e 4.1", until: "DnD5e 5.0" }
  );

  const rollConfig = {
    event, ammunition, attackMode, mastery, elvenAccuracy, halflingLucky, reliableTalent,
    rolls: [{
      parts, data,
      options: {
        advantage, disadvantage,
        criticalSuccess: critical,
        criticalFailure: fumble,
        target: targetValue
      }
    }]
  };

  const dialogConfig = {
    options: {
      ammunitionOptions,
      attackModes,
      chooseModifier,
      masteryOptions,
      ...(dialogOptions ?? {}),
      title
    }
  };
  if ( fastForward !== undefined ) dialogConfig.configure = !fastForward;

  const messageConfig = {
    create: chatMessage,
    data: {
      ...messageData,
      flavor
    },
    rollMode: rollMode ?? game.settings.get("core", "rollMode")
  };

  const rolls = await CONFIG.Dice.D20Roll.build(rollConfig, dialogConfig, messageConfig);

  return rolls?.[0] ?? null;
}

/* -------------------------------------------- */
/* Damage Roll                                  */
/* -------------------------------------------- */

/**
 * Configuration data for a damage roll.
 *
 * @typedef {object} DamageRollConfiguration
 *
 * @property {SingleDamageRollConfiguration[]} [rollConfigs=[]]  Separate roll configurations for different damages.
 * @property {string[]} [parts=[]]  The dice roll component parts.
 * @property {object} [data={}]     Data that will be used when parsing this roll.
 * @property {Event} [event]        The triggering event for this roll.
 * @property {boolean} [returnMultiple=false] Should multiple rolls be returned, or only the first?
 *
 * ## Critical Handling
 * @property {boolean} [allowCritical=true]  Is this damage roll allowed to be rolled as critical?
 * @property {boolean} [critical]            Apply critical to this roll (unless overridden by modifier key or dialog)?
 * @property {number} [criticalBonusDice]    A number of bonus damage dice that are added for critical hits.
 * @property {number} [criticalMultiplier]   Multiplier to use when calculating critical damage.
 * @property {boolean} [multiplyNumeric]     Should numeric terms be multiplied when this roll criticals?
 * @property {boolean} [powerfulCritical]    Should the critical dice be maximized rather than rolled?
 * @property {string} [criticalBonusDamage]  An extra damage term that is applied only on a critical hit.
 *
 * ## Roll Configuration Dialog
 * @property {boolean} [fastForward]        Should the roll configuration dialog be skipped?
 * @property {string} [template]            The HTML template used to render the roll configuration dialog.
 * @property {string} [title]               Title of the roll configuration dialog.
 * @property {object} [dialogOptions]       Additional options passed to the roll configuration dialog.
 *
 * ## Chat Message
 * @property {boolean} [chatMessage=true]  Should a chat message be created for this roll?
 * @property {object} [messageData={}]     Additional data which is applied to the created chat message.
 * @property {string} [rollMode]           Value of `CONST.DICE_ROLL_MODES` to apply as default for the chat message.
 * @property {string} [flavor]             Flavor text to use in the created chat message.
 */

/**
 * Configuration data for a single damage roll.
 *
 * @typedef {object} SingleDamageRollConfiguration
 * @property {string[]} parts         The dice roll component parts.
 * @property {string} [type]          Damage type represented by the roll.
 * @property {string[]} [types]       List of damage types selectable in the configuration app. If no
 *                                    type is provided, then the first of these types will be used.
 * @property {string[]} [properties]  Physical properties of the damage source (e.g. magical, silvered).
 */

/**
 * A standardized helper function for managing core 5e damage rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
 *
 * @param {DamageRollConfiguration} configuration    Configuration data for the Damage roll.
 * @returns {Promise<DamageRoll|DamageRoll[]|null>}  The evaluated DamageRoll, or null if the workflow was canceled.
 */
export async function damageRoll({
  rollConfigs=[], parts=[], data={}, event, returnMultiple=false,
  allowCritical=true, critical, criticalBonusDice, criticalMultiplier,
  multiplyNumeric, powerfulCritical, criticalBonusDamage,
  fastForward, template, title, dialogOptions,
  chatMessage=true, messageData={}, rollMode, flavor
}={}) {
  foundry.utils.logCompatibilityWarning(
    "The `damageRoll` standalone method has been deprecated and replaced with `CONFIG.Dice.DamageRoll.build`.",
    { since: "DnD5e 4.0", until: "DnD5e 5.0" }
  );

  const rollConfig = {
    event,
    critical: {
      allow: allowCritical,
      multiplier: criticalMultiplier,
      multiplyNumeric: multiplyNumeric ?? game.settings.get("dnd5e", "criticalDamageModifiers"),
      powerfulCritical: powerfulCritical ?? game.settings.get("dnd5e", "criticalDamageMaxDice")
    },
    rolls: rollConfigs.map(r => ({
      data,
      parts: r.parts,
      options: {
        isCritical: critical,
        properties: r.properties,
        type: r.type,
        types: r.types
      }
    }))
  };
  if ( parts.length ) rollConfig.rolls.unshift({ data, parts });
  if ( rollConfig.rolls[0] ) {
    foundry.utils.setProperty(rollConfig.rolls[0], "options.critical.bonusDice", criticalBonusDice);
    foundry.utils.setProperty(rollConfig.rolls[0], "options.critical.bonusDamage", criticalBonusDamage);
  }

  const dialogConfig = {
    options: {
      ...(dialogOptions ?? {}),
      title
    }
  };
  if ( fastForward !== undefined ) dialogConfig.configure = !fastForward;

  const messageConfig = {
    create: chatMessage,
    data: {
      ...messageData,
      flavor
    },
    rollMode: rollMode ?? game.settings.get("core", "rollMode")
  };

  const rolls = await CONFIG.Dice.DamageRoll.build(rollConfig, dialogConfig, messageConfig);

  if ( returnMultiple ) return rolls;
  if ( rolls?.length <= 1 ) return rolls[0];

  const mergedRoll = new CONFIG.Dice.DamageRoll();
  mergedRoll._total = 0;
  for ( const roll of rolls ) {
    if ( mergedRoll.terms.length ) {
      const operator = new OperatorTerm({operator: "+"});
      operator._evaluated = true;
      mergedRoll.terms.push(operator);
    }
    mergedRoll.terms.push(...roll.terms);
    mergedRoll._total += roll.total;
    mergedRoll.options = foundry.utils.mergeObject(roll.options, mergedRoll.options, { inplace: false });
  }
  mergedRoll._evaluated = true;
  mergedRoll.resetFormula();
  return mergedRoll;
}
