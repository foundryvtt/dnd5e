import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";
import DamageRoll from "../dice/damage-roll.mjs";

/**
 * Highlight critical success or failure on d20 rolls.
 * @param {ChatMessage} message  Message being prepared.
 * @param {HTMLElement} html     Rendered contents of the message.
 * @param {object} data          Configuration data passed to the message.
 */
export function highlightCriticalSuccessFailure(message, html, data) {
  if ( !message.isContentVisible || !message.rolls.length ) return;
  const displayChallenge = shouldDisplayChallenge(message);

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
    else if ( d.options.target && displayChallenge ) {
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

    if ( shouldDisplayChallenge(message) ) chatCard[0].dataset.displayChallenge = "";

    // If the user is the message author or the actor owner, proceed
    let actor = game.actors.get(data.message.speaker.actor);
    if ( actor && actor.isOwner ) return;
    else if ( game.user.isGM || (data.author.id === game.user.id)) return;

    // Otherwise conceal action buttons except for saving throw
    const buttons = chatCard.find("button[data-action]");
    buttons.each((i, btn) => {
      if ( (btn.dataset.action === "save") || (btn.dataset.action === "rollRequest") ) return;
      btn.style.display = "none";
    });
  }
}

/* -------------------------------------------- */

/**
 * Should roll DCs and other challenge details be displayed on this card?
 * @param {ChatMessage} message  Chat message being displayed.
 * @returns {boolean}
 */
function shouldDisplayChallenge(message) {
  if ( game.user.isGM || (message.user === game.user) ) return true;
  switch ( game.settings.get("dnd5e", "challengeVisibility") ) {
    case "all": return true;
    case "player": return !message.user.isGM;
    default: return false;
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

  // Enriched roll flavor
  const roll = message.getFlag("dnd5e", "roll");
  const item = fromUuidSync(roll?.itemUuid);
  if ( item ) {
    const isCritical = (roll.type === "damage") && message.rolls[0]?.options?.critical;
    const subtitle = roll.type === "damage"
      ? isCritical ? game.i18n.localize("DND5E.CriticalHit") : game.i18n.localize("DND5E.DamageRoll")
      : roll.type === "attack"
        ? game.i18n.localize(`DND5E.Action${item.system.actionType.toUpperCase()}`)
        : item.system.type?.label ?? game.i18n.localize(CONFIG.Item.typeLabels[item.type]);
    const flavor = document.createElement("div");
    flavor.classList.add("dnd5e2", "chat-card");
    flavor.innerHTML = `
      <section class="card-header description">
        <header class="summary">
          <img class="gold-icon" src="${item.img}" alt="${item.name}">
          <div class="name-stacked">
            <span class="title">${item.name}</span>
            <span class="subtitle ${isCritical ? "critical" : ""}">${subtitle}</span>
          </div>
        </header>
      </section>
    `;
    html.querySelector(".message-header .flavor-text").remove();
    html.querySelector(".message-content").insertAdjacentElement("afterbegin", flavor);
  }

  // Dice rolls
  html.querySelectorAll(".dice-tooltip").forEach((el, i) => {
    if ( !(roll instanceof DamageRoll) ) enrichRollTooltip(message.rolls[i], el);
  });
  enrichDamageTooltip(message.rolls.filter(r => r instanceof DamageRoll), html);
  html.querySelectorAll(".dice-roll").forEach(el => el.addEventListener("click", onClickDiceRoll));
  html.querySelectorAll(".dice-tooltip").forEach(el => el.style.height = "0");
}

/* -------------------------------------------- */

/**
 * Augment roll tooltips with some additional information and styling.
 * @param {Roll} roll            The roll instance.
 * @param {HTMLDivElement} html  The roll tooltip markup.
 */
function enrichRollTooltip(roll, html) {
  const constant = Number(simplifyRollFormula(roll.formula, { deterministic: true }));
  if ( !constant ) return;
  const sign = constant < 0 ? "-" : "+";
  const part = document.createElement("section");
  part.classList.add("tooltip-part", "constant");
  part.innerHTML = `
    <div class="dice">
      <ol class="dice-rolls"></ol>
      <div class="total">
        <span class="value"><span class="sign">${sign}</span>${Math.abs(constant)}</span>
      </div>
    </div>
  `;
  html.appendChild(part);
}

/* -------------------------------------------- */

/**
 * Coalesce damage rolls into a single breakdown.
 * @param {DamageRoll[]} rolls  The damage rolls.
 * @param {HTMLElement} html    The chat card markup.
 */
function enrichDamageTooltip(rolls, html) {
  if ( !rolls.length ) return;
  let { formula, total, breakdown } = rolls.reduce((obj, r) => {
    obj.formula.push(r.formula);
    obj.total += r.total;
    aggregateDamageRoll(r, obj.breakdown);
    return obj;
  }, { formula: [], total: 0, breakdown: {} });
  formula = formula.join(" + ");
  html.querySelectorAll(".dice-roll").forEach(el => el.remove());
  const roll = document.createElement("div");
  roll.classList.add("dice-roll");
  roll.innerHTML = `
    <div class="dice-result">
      <div class="dice-formula">${formula}</div>
      <div class="dice-tooltip">
        ${Object.entries(breakdown).reduce((str, [type, { total, constant, dice }]) => {
          const config = CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type];
          return `${str}
            <section class="tooltip-part">
              <div class="dice">
                <ol class="dice-rolls">
                  ${dice.reduce((str, { result, classes }) => `
                    ${str}<li class="roll ${classes}">${result}</li>
                  `, "")}
                  ${constant ? `
                  <li class="constant"><span class="sign">${constant < 0 ? "-" : "+"}</span>${Math.abs(constant)}</li>
                  ` : ""}
                </ol>
                <div class="total">
                  ${config ? `<img src="${config.icon}" alt="${config.label}">` : ""}
                  <span class="label">${config?.label ?? ""}</span>
                  <span class="value">${total}</span>
                </div>
              </div>
            </section>
          `;
        }, "")}
      </div>
      <h4 class="dice-total">${total}</h4>
    </div>
  `;
  html.querySelector(".message-content").appendChild(roll);
}

/* -------------------------------------------- */

/**
 * Aggregate damage roll information by damage type.
 * @param {DamageRoll} roll  The damage roll.
 * @param {Record<string, {total: number, constant: number, dice: {result: string, classes: string}[]}>} breakdown
 */
function aggregateDamageRoll(roll, breakdown) {
  const isDamageType = t => (t in CONFIG.DND5E.damageTypes) || (t in CONFIG.DND5E.healingTypes);
  for ( let i = roll.terms.length - 1; i >= 0; ) {
    const term = roll.terms[i--];
    if ( !(term instanceof NumericTerm) && !(term instanceof DiceTerm) ) continue;
    const flavor = term.flavor?.toLowerCase();
    const type = isDamageType(flavor) ? flavor : roll.options.type;
    const aggregate = breakdown[type] ??= { total: 0, constant: 0, dice: [] };
    const value = term.total;
    if ( term instanceof DiceTerm ) aggregate.dice.push(...term.results.map(r => ({
      result: term.getResultLabel(r), classes: term.getResultCSS(r).filterJoin(" ")
    })));
    let multiplier = 1;
    let operator = roll.terms[i];
    while ( operator instanceof OperatorTerm ) {
      if ( operator.operator === "-" ) multiplier *= -1;
      operator = roll.terms[--i];
    }
    aggregate.total += value * multiplier;
    if ( term instanceof NumericTerm ) aggregate.constant += value * multiplier;
  }
}

/* -------------------------------------------- */

/**
 * Handle dice roll expansion.
 * @param {PointerEvent} event  The triggering event.
 */
function onClickDiceRoll(event) {
  event.stopPropagation();
  const target = event.currentTarget;
  target.classList.toggle("expanded");
  const expanded = target.classList.contains("expanded");
  const tooltip = target.querySelector(".dice-tooltip");
  tooltip.style.height = expanded ? `${tooltip.scrollHeight}px` : "0";
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
  html.find(".effects-tray").each((i, el) => {
    if ( game.user.isGM ) {
      el.classList.add("collapsed");
      el.querySelector(".collapsible-content").style.height = "0";
    }
    else el.remove();
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
