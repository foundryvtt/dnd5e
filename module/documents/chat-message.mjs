import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";
import DamageRoll from "../dice/damage-roll.mjs";

export default class ChatMessage5e extends ChatMessage {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Should the apply damage options appear?
   * @type {boolean}
   */
  get canApplyDamage() {
    return this.isRoll && this.isContentVisible && canvas.tokens?.controlled.length;
  }

  /* -------------------------------------------- */

  /**
   * Should roll DCs and other challenge details be displayed on this card?
   * @type {boolean}
   */
  get shouldDisplayChallenge() {
    if ( game.user.isGM || (this.user === game.user) ) return true;
    switch ( game.settings.get("dnd5e", "challengeVisibility") ) {
      case "all": return true;
      case "player": return !this.user.isGM;
      default: return false;
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getHTML(...args) {
    const html = await super.getHTML();

    this._displayChatActionButtons(html);
    this._highlightCriticalSuccessFailure(html);
    if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      // First selector ensures legacy chat cards continue to collapse properly
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
      el.classList.add("collapsed");
      el.querySelector(".collapsible-content").style.height = "0";
    });
    this._enrichChatCard(html[0]);

    /**
     * A hook event that fires after dnd5e-specific chat message modifications have completed.
     * @function dnd5e.renderChatMessage
     * @memberof hookEvents
     * @param {ChatMessage5e} message  Chat message being rendered.
     * @param {HTMLElement} html       HTML contents of the message.
     */
    Hooks.callAll("dnd5e.renderChatMessage", this, html[0]);

    return html;
  }

  /* -------------------------------------------- */

  /**
   * Optionally hide the display of chat card action buttons which cannot be performed by the user
   * @param {jQuery} html     Rendered contents of the message.
   * @protected
   */
  _displayChatActionButtons(html) {
    const chatCard = html.find(".dnd5e.chat-card, .dnd5e2.chat-card");
    if ( chatCard.length > 0 ) {
      const flavor = html.find(".flavor-text");
      if ( flavor.text() === html.find(".item-name").text() ) flavor.remove();

      if ( this.shouldDisplayChallenge ) chatCard[0].dataset.displayChallenge = "";

      // Conceal effects that the user cannot apply.
      chatCard.find(".effects-tray .effect").each((i, el) => {
        if ( !game.user.isGM && ((el.dataset.transferred === "false") || (this.user.id !== game.user.id)) ) el.remove();
      });

      // If the user is the message author or the actor owner, proceed
      let actor = game.actors.get(this.speaker.actor);
      if ( actor && actor.isOwner ) return;
      else if ( game.user.isGM || (this.user.id === game.user.id)) return;

      // Otherwise conceal action buttons except for saving throw
      const buttons = chatCard.find("button[data-action]:not(.apply-effect)");
      buttons.each((i, btn) => {
        if ( (btn.dataset.action === "save") || (btn.dataset.action === "rollRequest") ) return;
        btn.style.display = "none";
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Highlight critical success or failure on d20 rolls.
   * @param {jQuery} html     Rendered contents of the message.
   * @protected
   */
  _highlightCriticalSuccessFailure(html) {
    if ( !this.isContentVisible || !this.rolls.length ) return;
    const originatingMessage = game.messages.get(this.getFlag("dnd5e", "originatingMessage"));
    const displayChallenge = originatingMessage?.shouldDisplayChallenge;

    // Highlight rolls where the first part is a d20 roll
    for ( let [index, d20Roll] of this.rolls.entries() ) {

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
   * Augment the chat card markup for additional styling.
   * @param {HTMLElement} html  The chat card markup.
   * @protected
   */
  _enrichChatCard(html) {
    // Header matter
    const { scene: sceneId, token: tokenId, actor: actorId } = this.speaker;
    const actor = game.scenes.get(sceneId)?.tokens.get(tokenId)?.actor ?? game.actors.get(actorId);

    let img;
    let nameText;
    if ( this.isContentVisible ) {
      img = actor?.img ?? this.user.avatar;
      nameText = this.alias;
    } else {
      img = this.user.avatar;
      nameText = this.user.name;
    }

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");
    avatar.innerHTML = `<img src="${img}" alt="${nameText}">`;

    const name = document.createElement("span");
    name.classList.add("name-stacked");
    name.innerHTML = `<span class="title">${nameText}</span>`;

    const subtitle = document.createElement("span");
    subtitle.classList.add("subtitle");
    if ( this.whisper.length ) subtitle.innerText = html.querySelector(".whisper-to")?.innerText ?? "";
    if ( (nameText !== this.user?.name) && !subtitle.innerText.length ) subtitle.innerText = this.user?.name ?? "";

    name.appendChild(subtitle);

    const sender = html.querySelector(".message-sender");
    sender?.replaceChildren(avatar, name);
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
    const roll = this.getFlag("dnd5e", "roll");
    const item = fromUuidSync(roll?.itemUuid);
    if ( this.isContentVisible && item ) {
      const isCritical = (roll.type === "damage") && this.rolls[0]?.options?.critical;
      const subtitle = roll.type === "damage"
        ? isCritical ? game.i18n.localize("DND5E.CriticalHit") : game.i18n.localize("DND5E.DamageRoll")
        : roll.type === "attack"
          ? game.i18n.localize(`DND5E.Action${item.system.actionType.toUpperCase()}`)
          : item.system.type?.label ?? game.i18n.localize(CONFIG.Item.typeLabels[item.type]);
      const flavor = document.createElement("div");
      flavor.classList.add("dnd5e2", "chat-card");
      flavor.innerHTML = `
        <section class="card-header description ${isCritical ? "critical" : ""}">
          <header class="summary">
            <img class="gold-icon" src="${item.img}" alt="${item.name}">
            <div class="name-stacked">
              <span class="title">${item.name}</span>
              <span class="subtitle">${subtitle}</span>
            </div>
          </header>
        </section>
      `;
      html.querySelector(".message-header .flavor-text").remove();
      html.querySelector(".message-content").insertAdjacentElement("afterbegin", flavor);
    }

    // Attack targets
    this._enrichAttackTargets(html);

    // Dice rolls
    if ( this.isContentVisible ) {
      html.querySelectorAll(".dice-tooltip").forEach((el, i) => {
        if ( !(roll instanceof DamageRoll) ) this._enrichRollTooltip(this.rolls[i], el);
      });
      this._enrichDamageTooltip(this.rolls.filter(r => r instanceof DamageRoll), html);
    }
    html.querySelectorAll(".dice-roll").forEach(el => el.addEventListener("click", this._onClickDiceRoll.bind(this)));
    html.querySelectorAll(".dice-tooltip").forEach(el => el.style.height = "0");
  }

  /* -------------------------------------------- */

  /**
   * Augment roll tooltips with some additional information and styling.
   * @param {Roll} roll            The roll instance.
   * @param {HTMLDivElement} html  The roll tooltip markup.
   */
  _enrichRollTooltip(roll, html) {
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
   * Augment attack cards with additional information.
   * @param {HTMLLIElement} html   The chat card.
   * @protected
   */
  _enrichAttackTargets(html) {
    const attackRoll = this.rolls[0];
    const targets = this.getFlag("dnd5e", "targets");
    if ( !game.user.isGM || !(attackRoll instanceof dnd5e.dice.D20Roll) || !targets?.length ) return;
    const evaluation = document.createElement("ul");
    evaluation.classList.add("dnd5e2", "evaluation");
    evaluation.innerHTML = targets.reduce((str, { name, img, ac, uuid }) => {
      const isMiss = !attackRoll.isCritical && ((attackRoll.total < ac) || attackRoll.isFumble);
      return `
        ${str}
        <li data-uuid="${uuid}" class="target ${isMiss ? "miss" : "hit"}">
          <img src="${img}" alt="${name}">
          <div class="name-stacked">
            <span class="title">
              ${name}
              <i class="fas ${isMiss ? "fa-times" : "fa-check"}"></i>
            </span>
          </div>
          <div class="ac">
            <i class="fas fa-shield-halved"></i>
            <span>${ac}</span>
          </div>
        </li>
      `;
    }, "");
    html.querySelector(".message-content")?.appendChild(evaluation);
  }

  /* -------------------------------------------- */

  /**
   * Coalesce damage rolls into a single breakdown.
   * @param {DamageRoll[]} rolls  The damage rolls.
   * @param {HTMLElement} html    The chat card markup.
   * @protected
   */
  _enrichDamageTooltip(rolls, html) {
    if ( !rolls.length ) return;
    let { formula, total, breakdown } = rolls.reduce((obj, r) => {
      obj.formula.push(r.formula);
      obj.total += r.total;
      this._aggregateDamageRoll(r, obj.breakdown);
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
   * @protected
   */
  _aggregateDamageRoll(roll, breakdown) {
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
  /*  Event Handlers                              */
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
  static addChatMessageContextOptions(html, options) {
    let canApply = li => game.messages.get(li.data("messageId"))?.canApplyDamage;
    options.push(
      {
        name: game.i18n.localize("DND5E.ChatContextDamage"),
        icon: '<i class="fas fa-user-minus"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.data("messageId"))?.applyChatCardDamage(li, 1)
      },
      {
        name: game.i18n.localize("DND5E.ChatContextHealing"),
        icon: '<i class="fas fa-user-plus"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.data("messageId"))?.applyChatCardDamage(li, -1)
      },
      {
        name: game.i18n.localize("DND5E.ChatContextTempHP"),
        icon: '<i class="fas fa-user-clock"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.data("messageId"))?.applyChatCardTemp(li)
      },
      {
        name: game.i18n.localize("DND5E.ChatContextDoubleDamage"),
        icon: '<i class="fas fa-user-injured"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.data("messageId"))?.applyChatCardDamage(li, 2)
      },
      {
        name: game.i18n.localize("DND5E.ChatContextHalfDamage"),
        icon: '<i class="fas fa-user-shield"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.data("messageId"))?.applyChatCardDamage(li, 0.5)
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
  applyChatCardDamage(li, multiplier) {
    const damages = this.rolls.map(roll => ({
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
  applyChatCardTemp(li) {
    const roll = this.rolls[0];
    return Promise.all(canvas.tokens.controlled.map(t => {
      const a = t.actor;
      return a.applyTempHP(roll.total);
    }));
  }

  /* -------------------------------------------- */

  /**
   * Handle dice roll expansion.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onClickDiceRoll(event) {
    event.stopPropagation();
    const target = event.currentTarget;
    target.classList.toggle("expanded");
    const expanded = target.classList.contains("expanded");
    const tooltip = target.querySelector(".dice-tooltip");
    tooltip.style.height = expanded ? `${tooltip.scrollHeight}px` : "0";
  }

  /* -------------------------------------------- */

  /**
   * Handle rendering a chat popout.
   * @param {ChatPopout} app  The ChatPopout Application instance.
   * @param {jQuery} html     The rendered Application HTML.
   */
  static onRenderChatPopout(app, [html]) {
    const close = html.querySelector(".header-button.close");
    close.innerHTML = '<i class="fas fa-times"></i>';
    close.dataset.tooltip = game.i18n.localize("Close");
    close.setAttribute("aria-label", close.dataset.tooltip);
    html.querySelector(".message-metadata [data-context-menu]")?.remove();
  }

  /* -------------------------------------------- */

  /**
   * Wait to apply appropriate element heights until after the chat log has completed its initial batch render.
   * @param {jQuery} html  The chat log HTML.
   */
  static onRenderChatLog([html]) {
    if ( !game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      requestAnimationFrame(() => {
        html.querySelectorAll(".description.collapsible .details").forEach(el => {
          el.style.height = `${el.scrollHeight}px`;
        });
        // FIXME: Allow time for transitions to complete. Adding a transitionend listener does not appear to work, so
        // the transition time is hard-coded for now.
        setTimeout(() => ui.chat.scrollBottom(), 250);
      });
    }
  }
}
