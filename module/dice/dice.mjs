/* -------------------------------------------- */
/* D20 Roll                                     */
/* -------------------------------------------- */

/**
 * Configuration data for a D20 roll.
 *
 * @typedef {object} D20RollConfiguration
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
 *
 * ## Flags
 * @property {boolean} [elvenAccuracy]   Allow Elven Accuracy to modify this roll?
 * @property {boolean} [halflingLucky]   Allow Halfling Luck to modify this roll?
 * @property {boolean} [reliableTalent]  Allow Reliable Talent to modify this roll?
 *
 * ## Roll Configuration Dialog
 * @property {boolean} [fastForward]           Should the roll configuration dialog be skipped?
 * @property {boolean} [chooseModifier=false]  If the configuration dialog is shown, should the ability modifier be
 *                                             configurable within that interface?
 * @property {string} [template]               The HTML template used to display the roll configuration dialog.
 * @property {string} [title]                  Title of the roll configuration dialog.
 * @property {object} [dialogOptions]          Additional options passed to the roll configuration dialog.
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
 * @param {D20RollConfiguration} configuration  Configuration data for the D20 roll.
 * @returns {Promise<D20Roll|null>}             The evaluated D20Roll, or null if the workflow was cancelled.
 */
export async function d20Roll({
  parts=[], data={}, event,
  advantage, disadvantage, critical=20, fumble=1, targetValue,
  elvenAccuracy, halflingLucky, reliableTalent,
  fastForward, chooseModifier=false, template, title, dialogOptions,
  chatMessage=true, messageData={}, rollMode, flavor
}={}) {

  // Handle input arguments
  const formula = ["1d20"].concat(parts).join(" + ");
  const {advantageMode, isFF} = CONFIG.Dice.D20Roll.determineAdvantageMode({
    advantage, disadvantage, fastForward, event
  });
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");
  if ( chooseModifier && !isFF ) {
    data.mod = "@mod";
    if ( "abilityCheckBonus" in data ) data.abilityCheckBonus = "@abilityCheckBonus";
  }

  // Construct the D20Roll instance
  const roll = new CONFIG.Dice.D20Roll(formula, data, {
    flavor: flavor || title,
    advantageMode,
    defaultRollMode,
    rollMode,
    critical,
    fumble,
    targetValue,
    elvenAccuracy,
    halflingLucky,
    reliableTalent
  });

  // Prompt a Dialog to further configure the D20Roll
  if ( !isFF ) {
    const configured = await roll.configureDialog({
      title,
      chooseModifier,
      defaultRollMode,
      defaultAction: advantageMode,
      defaultAbility: data?.item?.ability || data?.defaultAbility,
      template
    }, dialogOptions);
    if ( configured === null ) return null;
  } else roll.options.rollMode ??= defaultRollMode;

  // Evaluate the configured roll
  await roll.evaluate({ allowInteractive: (roll.options.rollMode ?? defaultRollMode) !== CONST.DICE_ROLL_MODES.BLIND });

  // Attach original message ID to the message
  messageData = foundry.utils.expandObject(messageData);
  const messageId = event?.target.closest("[data-message-id]")?.dataset.messageId;
  if ( messageId ) foundry.utils.setProperty(messageData, "flags.dnd5e.originatingMessage", messageId);

  // Create a Chat Message
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
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

  // Handle input arguments
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");

  // If parts are still provided, treat it as the first roll
  if ( parts.length ) rollConfigs.unshift({ parts });

  const {isCritical, isFF} = _determineCriticalMode({critical, fastForward, event});
  const rolls = [];
  flavor ??= title;
  multiplyNumeric ??= game.settings.get("dnd5e", "criticalDamageModifiers");
  powerfulCritical ??= game.settings.get("dnd5e", "criticalDamageMaxDice");
  critical = isFF ? isCritical : false;
  for ( const [index, { parts, type, types, properties }] of rollConfigs.entries() ) {
    const formula = parts.join(" + ");
    const rollOptions = {
      flavor, rollMode, critical, criticalMultiplier, multiplyNumeric, powerfulCritical, type, types, properties
    };
    if ( index === 0 ) {
      rollOptions.criticalBonusDice = criticalBonusDice;
      rollOptions.criticalBonusDamage = criticalBonusDamage;
    }
    if ( formula ) rolls.push(new CONFIG.Dice.DamageRoll(formula, data, rollOptions));
  }

  // Prompt a Dialog to further configure the DamageRoll
  if ( !isFF ) {
    const configured = await CONFIG.Dice.DamageRoll.configureDialog(rolls, {
      title,
      defaultRollMode: defaultRollMode,
      defaultCritical: isCritical,
      template,
      allowCritical
    }, dialogOptions);
    if ( configured === null ) return null;
  }

  // Evaluate the configured roll
  for ( const roll of rolls ) {
    const rollMode = rolls.at(-1).options.rollMode ?? defaultRollMode;
    if ( !roll.options.type ) roll.options.type = roll.options.types?.[0];
    await roll.evaluate({ allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND });
  }

  // Attach original message ID to the message
  messageData = foundry.utils.expandObject(messageData);
  const messageId = event?.target.closest("[data-message-id]")?.dataset.messageId;
  if ( messageId ) foundry.utils.setProperty(messageData, "flags.dnd5e.originatingMessage", messageId);

  // Create a Chat Message
  if ( rolls?.length && chatMessage ) await CONFIG.Dice.DamageRoll.toMessage(rolls, messageData, { rollMode });
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

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @param {object} [config]
 * @param {Event} [config.event]          Event that triggered the roll.
 * @param {boolean} [config.critical]     Is this roll treated as a critical by default?
 * @param {boolean} [config.fastForward]  Should the roll dialog be skipped?
 * @returns {{isFF: boolean, isCritical: boolean}}  Whether the roll is fast-forward, and whether it is a critical hit
 */
function _determineCriticalMode({event, critical=false, fastForward}={}) {
  const isFF = fastForward ?? (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  if ( event?.altKey ) critical = true;
  return {isFF: !!isFF, isCritical: critical};
}
