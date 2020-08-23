/**
 * A standardized helper function for managing core 5e "d20 rolls"
 *
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Advantage, or Disadvantage respectively
 *
 * @param {Array} parts             The dice roll component parts, excluding the initial d20
 * @param {Object} data             Actor or item data against which to parse the roll
 * @param {Event|object} event      The triggering event which initiated the roll
 * @param {string} rollMode         A specific roll mode to apply as the default for the resulting roll
 * @param {string|null} template    The HTML template used to render the roll dialog
 * @param {string|null} title       The dice roll UI window title
 * @param {Object} speaker          The ChatMessage speaker to pass when creating the chat
 * @param {string|null} flavor      Flavor text to use in the posted chat message
 * @param {Boolean} fastForward     Allow fast-forward advantage selection
 * @param {Function} onClose        Callback for actions to take when the dialog form is closed
 * @param {Object} dialogOptions    Modal dialog options
 * @param {boolean} advantage       Apply advantage to the roll (unless otherwise specified)
 * @param {boolean} disadvantage    Apply disadvantage to the roll (unless otherwise specified)
 * @param {number} critical         The value of d20 result which represents a critical success
 * @param {number} fumble           The value of d20 result which represents a critical failure
 * @param {number} targetValue      Assign a target value against which the result of this roll should be compared
 * @param {boolean} elvenAccuracy   Allow Elven Accuracy to modify this roll?
 * @param {boolean} halflingLucky   Allow Halfling Luck to modify this roll?
 * @param {boolean} reliableTalent  Allow Reliable Talent to modify this roll?
 * @param {boolean} chatMessage     Automatically create a Chat Message for the result of this roll
 * @param {object} messageData      Additional data which is applied to the created Chat Message, if any
 *
 * @return {Promise}                A Promise which resolves once the roll workflow has completed
 */
export async function d20Roll({parts=[], data={}, event={}, rollMode=null, template=null, title=null, speaker=null,
  flavor=null, fastForward=null, dialogOptions,
  advantage=null, disadvantage=null, critical=20, fumble=1, targetValue=null,
  elvenAccuracy=false, halflingLucky=false, reliableTalent=false,
  chatMessage=true, messageData={}}={}) {

  // Prepare Message Data
  messageData.flavor = flavor || title;
  messageData.speaker = speaker || ChatMessage.getSpeaker();
  const messageOptions = {rollMode: rollMode || game.settings.get("core", "rollMode")};
  parts = parts.concat(["@bonus"]);

  // Handle fast-forward events
  let adv = 0;
  fastForward = fastForward ?? (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));
  if (fastForward) {
    if ( advantage || event.altKey ) adv = 1;
    else if ( disadvantage || event.ctrlKey || event.metaKey ) adv = -1;
  }

  // Define the inner roll function
  const _roll = (parts, adv, form) => {

    // Determine the d20 roll and modifiers
    let nd = 1;
    let mods = halflingLucky ? "r=1" : "";

    // Handle advantage
    if (adv === 1) {
      nd = elvenAccuracy ? 3 : 2;
      messageData.flavor += ` (${game.i18n.localize("DND5E.Advantage")})`;
      if ( "flags.dnd5e.roll" in messageData ) messageData["flags.dnd5e.roll"].advantage = true;
      mods += "kh";
    }

    // Handle disadvantage
    else if (adv === -1) {
      nd = 2;
      messageData.flavor += ` (${game.i18n.localize("DND5E.Disadvantage")})`;
      if ( "flags.dnd5e.roll" in messageData ) messageData["flags.dnd5e.roll"].disadvantage = true;
      mods += "kl";
    }

    // Prepend the d20 roll
    let formula = `${nd}d20${mods}`;
    if (reliableTalent) formula = `{${nd}d20${mods},10}kh`;
    parts.unshift(formula);

    // Optionally include a situational bonus
    if ( form ) {
      data['bonus'] = form.bonus.value;
      messageOptions.rollMode = form.rollMode.value;
    }
    if (!data["bonus"]) parts.pop();

    // Optionally include an ability score selection (used for tool checks)
    const ability = form ? form.ability : null;
    if (ability && ability.value) {
      data.ability = ability.value;
      const abl = data.abilities[data.ability];
      if (abl) {
        data.mod = abl.mod;
        messageData.flavor += ` (${CONFIG.DND5E.abilities[data.ability]})`;
      }
    }

    // Execute the roll
    let roll = new Roll(parts.join(" + "), data);
    try {
      roll.roll();
    } catch (err) {
      console.error(err);
      ui.notifications.error(`Dice roll evaluation failed: ${err.message}`);
      return null;
    }

    // Flag d20 options for any 20-sided dice in the roll
    for (let d of roll.dice) {
      if (d.faces === 20) {
        d.options.critical = critical;
        d.options.fumble = fumble;
        if (targetValue) d.options.target = targetValue;
      }
    }

    // If reliable talent was applied, add it to the flavor text
    if (reliableTalent && roll.dice[0].total < 10) {
      messageData.flavor += ` (${game.i18n.localize("DND5E.FlagsReliableTalent")})`;
    }
    return roll;
  };

  // Create the Roll instance
  const roll = fastForward ? _roll(parts, adv) :
    await _d20RollDialog({template, title, parts, data, rollMode: messageOptions.rollMode, dialogOptions, roll: _roll});

  // Create a Chat Message
  if ( roll && chatMessage ) roll.toMessage(messageData, messageOptions);
  return roll;
}

/* -------------------------------------------- */


/**
 * Present a Dialog form which creates a d20 roll once submitted
 * @return {Promise<Roll>}
 * @private
 */
async function _d20RollDialog({template, title, parts, data, rollMode, dialogOptions, roll}={}) {

  // Render modal dialog
  template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
  let dialogData = {
    formula: parts.join(" + "),
    data: data,
    rollMode: rollMode,
    rollModes: CONFIG.Dice.rollModes,
    config: CONFIG.DND5E
  };
  const html = await renderTemplate(template, dialogData);

  // Create the Dialog window
  return new Promise(resolve => {
    new Dialog({
      title: title,
      content: html,
      buttons: {
        advantage: {
          label: game.i18n.localize("DND5E.Advantage"),
          callback: html => resolve(roll(parts, 1, html[0].querySelector("form")))
        },
        normal: {
          label: game.i18n.localize("DND5E.Normal"),
          callback: html => resolve(roll(parts, 0, html[0].querySelector("form")))
        },
        disadvantage: {
          label: game.i18n.localize("DND5E.Disadvantage"),
          callback: html => resolve(roll(parts, -1, html[0].querySelector("form")))
        }
      },
      default: "normal",
      close: () => resolve(null)
    }, dialogOptions).render(true);
  });
}


/* -------------------------------------------- */

/**
 * A standardized helper function for managing core 5e "d20 rolls"
 *
 * Holding SHIFT, ALT, or CTRL when the attack is rolled will "fast-forward".
 * This chooses the default options of a normal attack with no bonus, Critical, or no bonus respectively
 *
 * @param {Array} parts           The dice roll component parts, excluding the initial d20
 * @param {Actor} actor           The Actor making the damage roll
 * @param {Object} data           Actor or item data against which to parse the roll
 * @param {Event|object}[event    The triggering event which initiated the roll
 * @param {string} rollMode       A specific roll mode to apply as the default for the resulting roll
 * @param {String} template       The HTML template used to render the roll dialog
 * @param {String} title          The dice roll UI window title
 * @param {Object} speaker        The ChatMessage speaker to pass when creating the chat
 * @param {string} flavor         Flavor text to use in the posted chat message
 * @param {boolean} allowCritical Allow the opportunity for a critical hit to be rolled
 * @param {Boolean} critical      Flag this roll as a critical hit for the purposes of fast-forward rolls
 * @param {Boolean} fastForward   Allow fast-forward advantage selection
 * @param {Function} onClose      Callback for actions to take when the dialog form is closed
 * @param {Object} dialogOptions  Modal dialog options
 * @param {boolean} chatMessage     Automatically create a Chat Message for the result of this roll
 * @param {object} messageData      Additional data which is applied to the created Chat Message, if any
 *
 * @return {Promise}              A Promise which resolves once the roll workflow has completed
 */
export async function damageRoll({parts, actor, data, event={}, rollMode=null, template, title, speaker, flavor,
  allowCritical=true, critical=false, fastForward=null, dialogOptions, chatMessage=true, messageData={}}={}) {

  // Prepare Message Data
  messageData.flavor = flavor || title;
  messageData.speaker = speaker || ChatMessage.getSpeaker();
  const messageOptions = {rollMode: rollMode || game.settings.get("core", "rollMode")};
  parts = parts.concat(["@bonus"]);
  fastForward = fastForward ?? (event && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey));

  // Define inner roll function
  const _roll = function(parts, crit, form) {

    // Optionally include a situational bonus
    if ( form ) {
      data['bonus'] = form.bonus.value;
      messageOptions.rollMode = form.rollMode.value;
    }
    if (!data["bonus"]) parts.pop();

    // Create the damage roll
    let roll = new Roll(parts.join("+"), data);

    // Modify the damage formula for critical hits
    if ( crit === true ) {
      let add = (actor && actor.getFlag("dnd5e", "savageAttacks")) ? 1 : 0;
      let mult = 2;
      // TODO Backwards compatibility - REMOVE LATER
      if (isNewerVersion(game.data.version, "0.6.9")) roll.alter(mult, add);
      else roll.alter(add, mult);
      messageData.flavor += ` (${game.i18n.localize("DND5E.Critical")})`;
      if ( "flags.dnd5e.roll" in messageData ) messageData["flags.dnd5e.roll"].critical = true;
    }

    // Execute the roll
    try {
      return roll.roll();
    } catch(err) {
      console.error(err);
      ui.notifications.error(`Dice roll evaluation failed: ${err.message}`);
      return null;
    }
  };

  // Create the Roll instance
  const roll = fastForward ? _roll(parts, critical || event.altKey) : await _damageRollDialog({
    template, title, parts, data, allowCritical, rollMode: messageOptions.rollMode, dialogOptions, roll: _roll
  });

  // Create a Chat Message
  if ( roll && chatMessage ) roll.toMessage(messageData, messageOptions);
  return roll;

}

/* -------------------------------------------- */

/**
 * Present a Dialog form which creates a damage roll once submitted
 * @return {Promise<Roll>}
 * @private
 */
async function _damageRollDialog({template, title, parts, data, allowCritical, rollMode, dialogOptions, roll}={}) {

  // Render modal dialog
  template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
  let dialogData = {
    formula: parts.join(" + "),
    data: data,
    rollMode: rollMode,
    rollModes: CONFIG.Dice.rollModes
  };
  const html = await renderTemplate(template, dialogData);

  // Create the Dialog window
  return new Promise(resolve => {
    new Dialog({
      title: title,
      content: html,
      buttons: {
        critical: {
          condition: allowCritical,
          label: game.i18n.localize("DND5E.CriticalHit"),
          callback: html => resolve(roll(parts, true, html[0].querySelector("form")))
        },
        normal: {
          label: game.i18n.localize(allowCritical ? "DND5E.Normal" : "DND5E.Roll"),
          callback: html => resolve(roll(parts, false, html[0].querySelector("form")))
        },
      },
      default: "normal",
      close: () => resolve(null)
    }, dialogOptions).render(true);
  });
}
