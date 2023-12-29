/**
 * Highlight critical success or failure on d20 rolls.
 * @param {ChatMessage} message  Message being prepared.
 * @param {HTMLElement} html     Rendered contents of the message.
 * @param {object} data          Configuration data passed to the message.
 */
export function highlightCriticalSuccessFailure(message, html, data) {
  if ( !message.isRoll || !message.isContentVisible || !message.rolls.length ) return;

  // Highlight rolls where the first part is a d20 roll
  for ( let [index, d20Roll] of message.rolls.entries() ) {

    const d0 = d20Roll.dice[0];
    if ( (d0?.faces !== 20) || (d0?.values.length !== 1) ) continue;

    d20Roll = dnd5e.dice.D20Roll.fromRoll(d20Roll);
    const d = d20Roll.dice[0];

    const isModifiedRoll = ("success" in d.results[0]) || d.options.marginSuccess || d.options.marginFailure;
    if ( isModifiedRoll ) continue;

    // Highlight successes and failures
    const total = html.find(".dice-total")[index];
    if ( !total ) continue;
    if ( d20Roll.isCritical ) total.classList.add("critical");
    else if ( d20Roll.isFumble ) total.classList.add("fumble");
    else if ( d.options.target ) {
      if ( d20Roll.total >= d.options.target ) total.classList.add("success");
      else total.classList.add("failure");
    }
  }
}

/* -------------------------------------------- */

/**
 * Optionally hide the display of chat card action buttons which cannot be performed by the user
 * @param {ChatMessage} message  Message being prepared.
 * @param {HTMLElement} html     Rendered contents of the message.
 * @param {object} data          Configuration data passed to the message.
 */
export function displayChatActionButtons(message, html, data) {
  const chatCard = html.find(".dnd5e.chat-card");
  if ( chatCard.length > 0 ) {
    const flavor = html.find(".flavor-text");
    if ( flavor.text() === html.find(".item-name").text() ) flavor.remove();

    // If the user is the message author or the actor owner, proceed
    let actor = game.actors.get(data.message.speaker.actor);
    if ( actor && actor.isOwner ) return;
    else if ( game.user.isGM || (data.author.id === game.user.id)) return;

    // Otherwise conceal action buttons except for saving throw
    const buttons = chatCard.find("button[data-action]");
    buttons.each((i, btn) => {
      if ( btn.dataset.action === "save" ) return;
      btn.style.display = "none";
    });
  }
}

/* -------------------------------------------- */

/**
 * This function is used to hook into the Chat Log context menu to add additional options to each message
 * These options make it easy to conveniently apply damage to controlled tokens based on the value of a Roll
 *
 * @param {HTMLElement} html    The Chat Message being rendered
 * @param {object[]} options    The Array of Context Menu options
 *
 * @returns {object[]}          The extended options Array including new context choices
 */
export function addChatMessageContextOptions(html, options) {
  let canApply = li => {
    const message = game.messages.get(li.data("messageId"));
    return message?.isRoll && message?.isContentVisible && canvas.tokens?.controlled.length;
  };
  options.push(
    {
      name: game.i18n.localize("DND5E.ChatContextDamage"),
      icon: '<i class="fas fa-user-minus"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHealing"),
      icon: '<i class="fas fa-user-plus"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, -1)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextTempHP"),
      icon: '<i class="fas fa-user-clock"></i>',
      condition: canApply,
      callback: li => applyChatCardTemp(li)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextDoubleDamage"),
      icon: '<i class="fas fa-user-injured"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 2)
    },
    {
      name: game.i18n.localize("DND5E.ChatContextHalfDamage"),
      icon: '<i class="fas fa-user-shield"></i>',
      condition: canApply,
      callback: li => applyChatCardDamage(li, 0.5)
    }
  );
  return options;
}

/* -------------------------------------------- */

/**
 * Apply rolled dice damage to the token or tokens which are currently controlled.
 * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
 *
 * @param {HTMLElement} li      The chat entry which contains the roll data
 * @param {number} multiplier   A damage multiplier to apply to the rolled damage.
 * @returns {Promise}
 */
function applyChatCardDamage(li, multiplier) {
  const message = game.messages.get(li.data("messageId"));
  const damages = message.rolls.map(roll => ({
    value: roll.total,
    type: roll.options.type,
    properties: new Set(roll.options.properties ?? [])
  }));
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    return a.applyDamage(damages, { multiplier, ignore: true });
  }));
}

/* -------------------------------------------- */

/**
 * Apply rolled dice as temporary hit points to the controlled token(s).
 * @param {HTMLElement} li  The chat entry which contains the roll data
 * @returns {Promise}
 */
function applyChatCardTemp(li) {
  const message = game.messages.get(li.data("messageId"));
  const roll = message.rolls[0];
  return Promise.all(canvas.tokens.controlled.map(t => {
    const a = t.actor;
    return a.applyTempHP(roll.total);
  }));
}

/* -------------------------------------------- */

/**
 * Handle rendering of a chat message to the log
 * @param {ChatLog} app     The ChatLog instance
 * @param {jQuery} html     Rendered chat message HTML
 * @param {object} data     Data passed to the render context
 */
export function onRenderChatMessage(app, html, data) {
  displayChatActionButtons(app, html, data);
  highlightCriticalSuccessFailure(app, html, data);
  if (game.settings.get("dnd5e", "autoCollapseItemCards")) html.find(".card-content").hide();
}
