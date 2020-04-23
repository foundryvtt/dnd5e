import {Actor5e} from "./actor/entity.js";

/**
 * Highlight critical success or failure on d20 rolls
 */
export const highlightCriticalSuccessFailure = function(message, html, data) {
  if ( !message.isRoll || !message.isRollVisible || !message.roll.parts.length ) return;

  // Highlight rolls where the first part is a d20 roll
  const roll = message.roll;
  let d = roll.parts[0];
  const isD20Roll = d instanceof Die && (d.faces === 20) && (d.results.length === 1);
  if ( !isD20Roll ) return;

  // Ensure it is not a modified roll
  const isModifiedRoll = ("success" in d.rolls[0]) || d.options.marginSuccess || d.options.marginFailure;
  if ( isModifiedRoll ) return;

  // Highlight successes and failures
  if ( d.options.critical && (d.total > d.options.critical) ) html.find(".dice-total").addClass("critical");
  else if ( d.options.fumble && (d.total <= d.options.fumble) ) html.find(".dice-total").addClass("fumble");
  else if ( d.options.target ) {
    if ( roll.total >= d.options.target ) html.find(".dice-total").addClass("success");
    else html.find(".dice-total").addClass("failure");
  }
};

/* -------------------------------------------- */

/**
 * Optionally hide the display of chat card action buttons which cannot be performed by the user
 */
export const displayChatActionButtons = function(message, html, data) {
  const chatCard = html.find(".dnd5e.chat-card");
  if ( chatCard.length > 0 ) {

    // If the user is the message author or the actor owner, proceed
    let actor = game.actors.get(data.message.speaker.actor);
    if ( actor && actor.owner ) return;
    else if ( game.user.isGM || (data.author.id === game.user.id)) return;

    // Otherwise conceal action buttons except for saving throw
    const buttons = chatCard.find("button[data-action]");
    buttons.each((i, btn) => {
      if ( btn.dataset.action === "save" ) return;
      btn.style.display = "none"
    });
  }
};

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {Array} options       The Array of Context Menu options
 *
 * @return {Array}              The extended options Array including new context choices
 */
export const addChatMessageContextOptions = function(html, options) {
  let canApply = li => canvas.tokens.controlledTokens.length && li.find(".dice-roll").length;
  options.push(
    {
      name: game.i18n.localize("DND5E.ChatContextDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, -1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextDoubleDamage"),
      icon: '<i class="fas fa-user-injured"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 2)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHalfDamage"),
      icon: '<i class="fas fa-user-shield"></i>',
      condition: canApply,
      callback: li => Actor5e.applyDamage(li, 0.5)
    }
  );
  return options;
};