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
  const chatCard = html.find(".dnd5e.chat-card, .dnd5e2.chat-card");
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
 * Augment the chat card markup for additional styling.
 * @param {jQuery} html  The chat card markup.
 */
function enrichChatCard([html]) {
  // Header matter
  const message = game.messages.get(html.dataset.messageId);
  const { scene: sceneId, token: tokenId, actor: actorId } = message.speaker;
  const actor = game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor ?? game.actors.get(actorId);
  const img = actor?.img ?? message.user.avatar;
  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.innerHTML = `<img src="${img}" alt="${message.alias}">`;
  const name = document.createElement("span");
  name.classList.add("name-stacked");
  name.innerHTML = `<span class="title">${message.alias}</span>`;
  const subtitle = document.createElement("span");
  subtitle.classList.add("subtitle");
  if ( message.whisper.length ) subtitle.innerText = html.querySelector(".whisper-to")?.innerText ?? "";
  else if ( message.alias !== message.user?.name ) subtitle.innerText = message.user?.name ?? "";
  name.appendChild(subtitle);
  const sender = html.querySelector(".message-sender");
  sender.replaceChildren(avatar, name);
  html.querySelector(".whisper-to")?.remove();

  // Context menu
  const metadata = html.querySelector(".message-metadata");
  metadata.querySelector(".message-delete")?.remove();
  const anchor = document.createElement("a");
  anchor.setAttribute("aria-label", game.i18n.localize("DND5E.AdditionalControls"));
  anchor.classList.add("chat-control");
  anchor.dataset.contextMenu = "";
  anchor.innerHTML = '<i class="fas fa-ellipsis-vertical fa-fw"></i>';
  metadata.appendChild(anchor);

  // SVG icons
  html.querySelectorAll("i.dnd5e-icon").forEach(el => {
    const icon = document.createElement("dnd5e-icon");
    icon.src = el.dataset.src;
    el.replaceWith(icon);
  });
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
  if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
    html.find(".card-content:not(.details)").hide();
    html.find(".description.collapsible").each((i, el) => {
      el.classList.add("collapsed");
      el.querySelector(".details").style.height = "0";
    });
  }
  else requestAnimationFrame(() => {
    html.find(".description.collapsible .details").each((i, el) => el.style.height = `${el.scrollHeight}px`);
  });
  enrichChatCard(html);
}

/* -------------------------------------------- */

/**
 * Handle rendering a chat popout.
 * @param {ChatPopout} app  The ChatPopout Application instance.
 * @param {jQuery} html     The rendered Application HTML.
 */
export function onRenderChatPopout(app, [html]) {
  const close = html.querySelector(".header-button.close");
  close.innerHTML = '<i class="fas fa-times"></i>';
  close.dataset.tooltip = game.i18n.localize("Close");
  close.setAttribute("aria-label", close.dataset.tooltip);
  html.querySelector(".message-metadata [data-context-menu]")?.remove();
}
