/* -------------------------------------------- */
/* D20 Roll                                     */
/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e d20 rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
 *
 * @param {object} [config]
 * @param {string[]} [config.parts]          The dice roll component parts, excluding the initial d20
 * @param {object} [config.data]             Actor or item data against which to parse the roll
 *
 * @param {boolean} [config.advantage]       Apply advantage to the roll (unless otherwise specified)
 * @param {boolean} [config.disadvantage]    Apply disadvantage to the roll (unless otherwise specified)
 * @param {number} [config.critical]         The value of d20 result which represents a critical success
 * @param {number} [config.fumble]           The value of d20 result which represents a critical failure
 * @param {number} [config.targetValue]      Assign a target value against which the result of this roll
 *                                           should be compared
 * @param {boolean} [config.elvenAccuracy]   Allow Elven Accuracy to modify this roll?
 * @param {boolean} [config.halflingLucky]   Allow Halfling Luck to modify this roll?
 * @param {boolean} [config.reliableTalent]  Allow Reliable Talent to modify this roll?
 *
 * @param {boolean} [config.chooseModifier=false] Choose the ability modifier that should be used when the roll is made
 * @param {boolean} [config.fastForward=false] Allow fast-forward advantage selection
 * @param {Event} [config.event]             The triggering event which initiated the roll
 * @param {string} [config.template]         The HTML template used to render the roll dialog
 * @param {string} [config.title]            The dialog window title
 * @param {object} [config.dialogOptions]    Modal dialog options
 *
 * @param {boolean} [config.chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [config.messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [config.rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [config.speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [config.flavor]         Flavor text to use in the posted chat message
 *
 * @returns {Promise<D20Roll|null>}  The evaluated D20Roll, or null if the workflow was cancelled
 */
export async function d20Roll({
  parts=[], data={}, // Roll creation
  advantage, disadvantage, fumble=1, critical=20, targetValue, elvenAccuracy, halflingLucky, reliableTalent, // Roll customization
  chooseModifier=false, fastForward=false, event, template, title, dialogOptions, // Dialog configuration
  chatMessage=true, messageData={}, rollMode, speaker, flavor // Chat Message customization
}={}) {

  // Handle input arguments
  const formula = ["1d20"].concat(parts).join(" + ");
  const {advantageMode, isFF} = _determineAdvantageMode({advantage, disadvantage, fastForward, event});
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
      defaultRollMode: defaultRollMode,
      defaultAction: advantageMode,
      defaultAbility: data?.item?.ability || data?.defaultAbility,
      template
    }, dialogOptions);
    if ( configured === null ) return null;
  }

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn("You are passing the speaker argument to the d20Roll function directly which should instead be passed as an internal key of messageData");
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
}

/* -------------------------------------------- */

/**
 * Determines whether this d20 roll should be fast-forwarded, and whether advantage or disadvantage should be applied
 * @param {object} [config]
 * @param {Event} [config.event]           Event that triggered the roll.
 * @param {boolean} [config.advantage]     Is something granting this roll advantage?
 * @param {boolean} [config.disadvantage]  Is something granting this roll disadvantage?
 * @param {boolean} [config.fastForward]   Should the roll dialog be skipped?
 * @returns {{isFF: boolean, advantageMode: number}}  Whether the roll is fast-forward, and its advantage mode.
 */
function _determineAdvantageMode({event, advantage=false, disadvantage=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  let advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.NORMAL;
  if ( advantage || event?.altKey ) advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE;
  else if ( disadvantage || event?.ctrlKey || event?.metaKey ) {
    advantageMode = CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
  }
  return {isFF, advantageMode};
}

/* -------------------------------------------- */
/* Damage Roll                                  */
/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e damage rolls.
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
 *
 * @param {object} [config]
 * @param {string[]} [config.parts]        The dice roll component parts, excluding the initial d20
 * @param {object} [config.data]           Actor or item data against which to parse the roll
 *
 * @param {boolean} [config.critical=false] Flag this roll as a critical hit for the purposes of
 *                                          fast-forward or default dialog action
 * @param {number} [config.criticalBonusDice=0] A number of bonus damage dice that are added for critical hits
 * @param {number} [config.criticalMultiplier=2] A critical hit multiplier which is applied to critical hits
 * @param {boolean} [config.multiplyNumeric=false] Multiply numeric terms by the critical multiplier
 * @param {boolean} [config.powerfulCritical=false] Apply the "powerful criticals" house rule to critical hits
 * @param {string} [config.criticalBonusDamage] An extra damage term that is applied only on a critical hit
 *
 * @param {boolean} [config.fastForward=false] Allow fast-forward advantage selection
 * @param {Event}[config.event]            The triggering event which initiated the roll
 * @param {boolean} [config.allowCritical=true] Allow the opportunity for a critical hit to be rolled
 * @param {string} [config.template]       The HTML template used to render the roll dialog
 * @param {string} [config.title]          The dice roll UI window title
 * @param {object} [config.dialogOptions]  Configuration dialog options
 *
 * @param {boolean} [config.chatMessage=true] Automatically create a Chat Message for the result of this roll
 * @param {object} [config.messageData={}] Additional data which is applied to the created Chat Message, if any
 * @param {string} [config.rollMode]       A specific roll mode to apply as the default for the resulting roll
 * @param {object} [config.speaker]        The ChatMessage speaker to pass when creating the chat
 * @param {string} [config.flavor]         Flavor text to use in the posted chat message
 *
 * @returns {Promise<DamageRoll|null>} The evaluated DamageRoll, or null if the workflow was canceled
 */
export async function damageRoll({
  parts=[], data, // Roll creation
  critical=false, criticalBonusDice, criticalMultiplier, multiplyNumeric, powerfulCritical,
  criticalBonusDamage, // Damage customization
  fastForward=false, event, allowCritical=true, template, title, dialogOptions, // Dialog configuration
  chatMessage=true, messageData={}, rollMode, speaker, flavor // Chat Message customization
}={}) {

  // Handle input arguments
  const defaultRollMode = rollMode || game.settings.get("core", "rollMode");

  // Construct the DamageRoll instance
  const formula = parts.join(" + ");
  const {isCritical, isFF} = _determineCriticalMode({critical, fastForward, event});
  const roll = new CONFIG.Dice.DamageRoll(formula, data, {
    flavor: flavor || title,
    rollMode,
    critical: isFF ? isCritical : false,
    criticalBonusDice,
    criticalMultiplier,
    criticalBonusDamage,
    multiplyNumeric: multiplyNumeric ?? game.settings.get("dnd5e", "criticalDamageModifiers"),
    powerfulCritical: powerfulCritical ?? game.settings.get("dnd5e", "criticalDamageMaxDice")
  });

  // Prompt a Dialog to further configure the DamageRoll
  if ( !isFF ) {
    const configured = await roll.configureDialog({
      title,
      defaultRollMode: defaultRollMode,
      defaultCritical: isCritical,
      template,
      allowCritical
    }, dialogOptions);
    if ( configured === null ) return null;
  }

  // Evaluate the configured roll
  await roll.evaluate({async: true});

  // Create a Chat Message
  if ( speaker ) {
    console.warn("You are passing the speaker argument to the damageRoll function directly which should instead be passed as an internal key of messageData");
    messageData.speaker = speaker;
  }
  if ( roll && chatMessage ) await roll.toMessage(messageData);
  return roll;
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
function _determineCriticalMode({event, critical=false, fastForward=false}={}) {
  const isFF = fastForward || (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  if ( event?.altKey ) critical = true;
  return {isFF, isCritical: critical};
}
