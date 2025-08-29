import aggregateDamageRolls from "../dice/aggregate-damage-rolls.mjs";
import DamageRoll from "../dice/damage-roll.mjs";
import simplifyRollFormula from "../dice/simplify-roll-formula.mjs";

export default class ChatMessage5e extends ChatMessage {

  /**
   * HTML tag names for chat trays that can open and close.
   * @type {string[]}
   */
  static TRAY_TYPES = ["damage-application", "effect-application"];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The currently highlighted token for attack roll evaluation.
   * @type {Token5e|null}
   */
  _highlighted = null;

  /* -------------------------------------------- */

  /**
   * Should the apply damage options appear?
   * @type {boolean}
   */
  get canApplyDamage() {
    const type = this.flags.dnd5e?.roll?.type;
    if ( type && (type !== "damage") ) return false;
    return this.isRoll && this.isContentVisible && !!canvas.tokens?.controlled.length;
  }

  /* -------------------------------------------- */

  /**
   * Should the select targets options appear?
   * @type {boolean}
   */
  get canSelectTargets() {
    if ( this.flags.dnd5e?.roll?.type !== "attack" ) return false;
    return this.isRoll && this.isContentVisible;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get isRoll() {
    if ( this.system?.isRoll !== undefined ) return this.system.isRoll;
    return super.isRoll && !this.flags.dnd5e?.rest;
  }

  /* -------------------------------------------- */

  /**
   * Should roll DCs and other challenge details be displayed on this card?
   * @type {boolean}
   */
  get shouldDisplayChallenge() {
    if ( game.user.isGM || (this.author === game.user) ) return true;
    switch ( game.settings.get("dnd5e", "challengeVisibility") ) {
      case "all": return true;
      case "player": return !this.author.isGM;
      default: return false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Store the state of any trays in the message.
   * @type {Map<string, boolean>}
   * @protected
   */
  _trayStates;

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    source = super.migrateData(source);
    if ( foundry.utils.hasProperty(source, "flags.dnd5e.itemData") ) {
      foundry.utils.setProperty(source, "flags.dnd5e.item.data", source.flags.dnd5e.itemData);
      delete source.flags.dnd5e.itemData;
    }
    if ( foundry.utils.hasProperty(source, "flags.dnd5e.use") ) {
      const use = source.flags.dnd5e.use;
      foundry.utils.setProperty(source, "flags.dnd5e.messageType", "usage");
      if ( use.type ) foundry.utils.setProperty(source, "flags.dnd5e.item.type", use.type);
      if ( use.itemId ) foundry.utils.setProperty(source, "flags.dnd5e.item.id", use.itemId);
      if ( use.itemUuid ) foundry.utils.setProperty(source, "flags.dnd5e.item.uuid", use.itemUuid);
    }
    return source;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
    if ( !this.flags.dnd5e?.item?.data && this.flags.dnd5e?.item?.id ) {
      const itemData = this.getFlag("dnd5e", "use.consumed.deleted")?.find(i => i._id === this.flags.dnd5e.item.id);
      if ( itemData ) Object.defineProperty(this.flags.dnd5e.item, "data", { value: itemData });
    }
    dnd5e.registry.messages.track(this);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async renderHTML(options={}) {
    const html = await super.renderHTML(options);

    if ( foundry.utils.getType(this.system?.getHTML) === "function" ) {
      await this.system.getHTML(html, options);
      return html;
    }

    this._displayChatActionButtons(html);
    this._highlightCriticalSuccessFailure(html);
    if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      html.querySelectorAll(".description.collapsible").forEach(el => el.classList.add("collapsed"));
    }

    this._enrichChatCard(html);
    this._collapseTrays(html);
    this._activateActivityListeners(html);
    dnd5e.bastion._activateChatListeners(this, html);

    /**
     * A hook event that fires after dnd5e-specific chat message modifications have completed.
     * @function dnd5e.renderChatMessage
     * @memberof hookEvents
     * @param {ChatMessage5e} message  Chat message being rendered.
     * @param {HTMLElement} html       HTML contents of the message.
     */
    Hooks.callAll("dnd5e.renderChatMessage", this, html);

    return html;
  }

  /* -------------------------------------------- */

  /**
   * Handle collapsing or expanding trays depending on user settings.
   * @param {HTMLElement} html  Rendered contents of the message.
   */
  _collapseTrays(html) {
    let collapse;
    switch ( game.settings.get("dnd5e", "autoCollapseChatTrays") ) {
      case "always": collapse = true; break;
      case "never":
      case "manual": collapse = false; break;
      // Collapse chat message trays older than 5 minutes
      case "older": collapse = this.timestamp < Date.now() - (5 * 60 * 1000); break;
    }
    for ( const tray of html.querySelectorAll(".card-tray") ) {
      tray.classList.toggle("collapsed", this._trayStates?.get(tray.className.replace(" collapsed", "")) ?? collapse);
    }
    for ( const element of html.querySelectorAll(this.constructor.TRAY_TYPES.join(", ")) ) {
      element.toggleAttribute("open", this._trayStates?.get(element.tagName) ?? !collapse);
    }
  }

  /* -------------------------------------------- */

  /**
   * Optionally hide the display of chat card action buttons which cannot be performed by the user
   * @param {HTMLElement} html  Rendered contents of the message.
   * @protected
   */
  _displayChatActionButtons(html) {
    const chatCard = html.querySelector(".chat-card");
    if ( chatCard ) {
      const flavor = html.querySelector(".flavor-text");
      if ( flavor?.innerText === html.querySelector(".item-name")?.innerText ) flavor?.remove();

      if ( this.shouldDisplayChallenge ) chatCard.dataset.displayChallenge = "";

      const actor = game.actors.get(this.speaker.actor);
      const isCreator = game.user.isGM || actor?.isOwner || (this.author.id === game.user.id);
      for ( const button of html.querySelectorAll(".card-buttons button") ) {
        if ( button.dataset.visibility === "all" ) continue;

        // GM buttons should only be visible to GMs, otherwise button should only be visible to message's creator
        if ( ((button.dataset.visibility === "gm") && !game.user.isGM) || !isCreator
          || this.getAssociatedActivity()?.shouldHideChatButton(button, this) ) button.hidden = true;
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Highlight critical success or failure on d20 rolls.
   * @param {HTMLElement} html  Rendered contents of the message.
   * @protected
   */
  _highlightCriticalSuccessFailure(html) {
    if ( !this.isContentVisible || !this.rolls.length ) return;
    const originatingMessage = this.getOriginatingMessage();
    const displayChallenge = originatingMessage?.shouldDisplayChallenge;
    const displayAttackResult = game.user.isGM || (game.settings.get("dnd5e", "attackRollVisibility") !== "none");
    const forceSuccess = this.flags.dnd5e?.roll?.forceSuccess === true;

    /**
     * Create an icon to indicate success or failure.
     * @param {string} cls  The icon class.
     * @returns {HTMLElement}
     */
    function makeIcon(cls) {
      const icon = document.createElement("i");
      icon.classList.add("fas", cls);
      icon.setAttribute("inert", "");
      return icon;
    }

    // Highlight rolls where the first part is a d20 roll
    const totals = html.querySelectorAll(".dice-total");
    for ( let [index, d20Roll] of this.rolls.entries() ) {

      const d0 = d20Roll.dice[0];
      if ( (d0?.faces !== 20) || (d0?.values.length !== 1) ) continue;

      d20Roll = dnd5e.dice.D20Roll.fromRoll(d20Roll);
      const d = d20Roll.dice[0];

      const isModifiedRoll = ("success" in d.results[0]) || d.options.marginSuccess || d.options.marginFailure;
      if ( isModifiedRoll ) continue;

      // Highlight successes and failures
      const total = totals[index];
      if ( !total ) continue;
      // Only attack rolls and death saves can crit or fumble.
      const canCrit = ["attack", "death"].includes(this.getFlag("dnd5e", "roll.type"));
      const isAttack = this.getFlag("dnd5e", "roll.type") === "attack";
      const showResult = isAttack ? displayAttackResult : displayChallenge;
      if ( d.options.target && showResult ) {
        if ( d20Roll.isSuccess || forceSuccess ) total.classList.add("success");
        else total.classList.add("failure");
      }
      if ( canCrit && d20Roll.isCritical ) total.classList.add("critical");
      if ( canCrit && d20Roll.isFumble && !forceSuccess ) total.classList.add("fumble");

      const icons = document.createElement("div");
      icons.classList.add("icons");
      if ( total.classList.contains("critical") ) icons.append(makeIcon("fa-check"), makeIcon("fa-check"));
      else if ( total.classList.contains("fumble") ) icons.append(makeIcon("fa-xmark"), makeIcon("fa-xmark"));
      else if ( total.classList.contains("success") ) icons.append(makeIcon("fa-check"));
      else if ( total.classList.contains("failure") ) icons.append(makeIcon("fa-xmark"));
      if ( icons.children.length ) total.append(icons);
    }
  }

  /* -------------------------------------------- */

  /**
   * Augment the chat card markup for additional styling.
   * @param {HTMLElement} html  The chat card markup.
   * @protected
   */
  _enrichChatCard(html) {
    html.querySelectorAll(".dnd5e2").forEach(el => el.classList.remove("dnd5e2")); // Legacy
    html.classList.add("dnd5e2");

    // Header matter
    const actor = this.getAssociatedActor();

    let img;
    let nameText;
    if ( this.isContentVisible ) {
      img = actor?.img ?? this.author.avatar;
      nameText = this.alias;
    } else {
      img = this.author.avatar;
      nameText = this.author.name;
    }

    const avatar = document.createElement("a");
    avatar.classList.add("avatar");
    if ( actor ) avatar.dataset.uuid = actor.uuid;
    const avatarImg = document.createElement("img");
    Object.assign(avatarImg, { src: img, alt: nameText });
    avatar.append(avatarImg);

    const name = document.createElement("span");
    name.classList.add("name-stacked");
    const title = document.createElement("span");
    title.classList.add("title");
    title.append(nameText);
    name.append(title);

    const subtitle = document.createElement("span");
    subtitle.classList.add("subtitle");
    if ( this.whisper.length ) subtitle.innerText = html.querySelector(".whisper-to")?.innerText ?? "";
    if ( (nameText !== this.author?.name) && !subtitle.innerText.length ) subtitle.innerText = this.author?.name ?? "";

    name.appendChild(subtitle);

    const sender = html.querySelector(".message-sender");
    sender?.replaceChildren(avatar, name);
    html.querySelector(".whisper-to")?.remove();

    // Context menu
    const metadata = html.querySelector(".message-metadata");
    const deleteButton = metadata.querySelector(".message-delete");
    if ( !game.user.isGM ) deleteButton?.remove();
    else deleteButton?.querySelector("i").classList.add("fa-fw");
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
    const item = this.getAssociatedItem();
    const activity = this.getAssociatedActivity();
    if ( this.isContentVisible && item && roll ) {
      const isCritical = (roll.type === "damage") && this.rolls[0]?.isCritical;
      const subtitle = roll.type === "damage"
        ? isCritical
          ? game.i18n.localize("DND5E.CriticalHit")
          : activity?.damageFlavor ?? game.i18n.localize("DND5E.DamageRoll")
        : roll.type === "attack"
          ? (activity?.getActionLabel(roll.attackMode) ?? "")
          : (item.system.type?.label ?? game.i18n.localize(CONFIG.Item.typeLabels[item.type]));
      const flavor = document.createElement("div");
      flavor.classList.add("chat-card");
      flavor.innerHTML = `
        <section class="card-header description ${isCritical ? "critical" : ""}">
          <header class="summary">
            <div class="name-stacked">
              <span class="subtitle">${subtitle}</span>
            </div>
          </header>
        </section>
      `;
      const icon = document.createElement("img");
      Object.assign(icon, { className: "gold-icon", src: item.img, alt: item.name });
      flavor.querySelector("header").insertAdjacentElement("afterbegin", icon);
      const title = document.createElement("span");
      title.classList.add("title");
      title.append(item.name);
      flavor.querySelector(".name-stacked").insertAdjacentElement("afterbegin", title);
      html.querySelector(".message-header .flavor-text").remove();
      html.querySelector(".message-content").insertAdjacentElement("afterbegin", flavor);
    }

    // Attack targets
    this._enrichAttackTargets(html);

    // Dice rolls
    if ( this.isContentVisible ) {
      html.querySelectorAll(".dice-tooltip").forEach((el, i) => {
        if ( !(roll instanceof DamageRoll) && this.rolls[i] ) this._enrichRollTooltip(this.rolls[i], el);
      });
      this._enrichDamageTooltip(this.rolls.filter(r => r instanceof DamageRoll), html);
      this._enrichSaveTooltip(html);
      this._enrichEnchantmentTooltip(html);
      html.querySelectorAll(".dice-roll").forEach(el => el.addEventListener("click", this._onClickDiceRoll.bind(this)));
    } else {
      html.querySelectorAll(".dice-roll").forEach(el => el.classList.add("secret-roll"));
    }

    // Effects tray
    this._enrichUsageEffects(html);

    avatar.addEventListener("click", this._onTargetMouseDown.bind(this));
    avatar.addEventListener("pointerover", this._onTargetHoverIn.bind(this));
    avatar.addEventListener("pointerout", this._onTargetHoverOut.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Augment roll tooltips with some additional information and styling.
   * @param {Roll} roll            The roll instance.
   * @param {HTMLDivElement} html  The roll tooltip markup.
   */
  _enrichRollTooltip(roll, html) {
    const constant = Number(simplifyRollFormula(roll._formula, { deterministic: true }));
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
    if ( !(attackRoll instanceof dnd5e.dice.D20Roll) ) return;

    const masteryConfig = CONFIG.DND5E.weaponMasteries[attackRoll.options.mastery];
    if ( masteryConfig ) {
      const p = document.createElement("p");
      p.classList.add("supplement");
      let mastery = masteryConfig.label;
      if ( masteryConfig.reference ) mastery = `
        <a class="content-link" draggable="true" data-link data-uuid="${masteryConfig.reference}"
           data-tooltip="${mastery}">${mastery}</a>
      `;
      p.innerHTML = `<strong>${game.i18n.format("DND5E.WEAPON.Mastery.Flavor")}</strong> ${mastery}`;
      (html.querySelector(".chat-card") ?? html.querySelector(".message-content"))?.appendChild(p);
    }

    const visibility = game.settings.get("dnd5e", "attackRollVisibility");
    const isVisible = game.user.isGM || (visibility !== "none");
    if ( !isVisible ) return;

    const targets = this.getFlag("dnd5e", "targets");
    if ( !targets?.length ) return;
    const tray = document.createElement("div");
    tray.innerHTML = `
      <div class="card-tray targets-tray collapsible collapsed">
        <label class="roboto-upper">
          <i class="fas fa-bullseye" inert></i>
          <span>${game.i18n.localize("DND5E.TargetPl")}</span>
          <i class="fas fa-caret-down" inert></i>
        </label>
        <div class="collapsible-content">
          <ul class="unlist evaluation wrapper"></ul>
        </div>
      </div>
    `;
    const evaluation = tray.querySelector("ul");
    const rows = targets.map(({ name, ac, uuid }) => {
      const isMiss = !attackRoll.isCritical && ((attackRoll.total < ac) || attackRoll.isFumble);
      if ( !game.user.isGM && (visibility !== "all") ) ac = "";
      const li = document.createElement("li");
      Object.assign(li.dataset, { uuid, miss: isMiss });
      li.className = `target ${isMiss ? "miss" : "hit"}`;
      li.innerHTML = `
        <i class="fas ${isMiss ? "fa-times" : "fa-check"}"></i>
        <div class="name"></div>
        ${(ac !== "") ? `
        <div class="ac">
          <i class="fas fa-shield-halved"></i>
          <span>${(ac === null) ? "&infin;" : ac}</span>
        </div>
        ` : ""}
      `;
      li.querySelector(".name").append(name);
      return li;
    }).sort((a, b) => {
      const missA = Boolean(a.dataset.miss);
      const missB = Boolean(b.dataset.miss);
      return missA === missB ? 0 : missA ? 1 : -1;
    });
    evaluation.append(...rows);
    evaluation.querySelectorAll("li.target").forEach(target => {
      target.addEventListener("click", this._onTargetMouseDown.bind(this));
      target.addEventListener("pointerover", this._onTargetHoverIn.bind(this));
      target.addEventListener("pointerout", this._onTargetHoverOut.bind(this));
    });
    html.querySelector(".message-content")?.appendChild(tray);
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
    const aggregatedRolls = CONFIG.DND5E.aggregateDamageDisplay ? aggregateDamageRolls(rolls) : rolls;
    let { formula, total, breakdown } = aggregatedRolls.reduce((obj, r) => {
      obj.formula.push(CONFIG.DND5E.aggregateDamageDisplay ? r.formula : ` + ${r.formula}`);
      obj.total += Math.max(0, r.total);
      obj.breakdown.push(this._simplifyDamageRoll(r));
      return obj;
    }, { formula: [], total: 0, breakdown: [] });
    formula = formula.join("").replace(/^ \+ /, "");
    html.querySelectorAll(".dice-roll").forEach(el => el.remove());
    const roll = document.createElement("div");
    roll.classList.add("dice-roll");

    const tooltipContents = breakdown.reduce((str, { type, total, constant, dice }) => {
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
    }, "");

    roll.innerHTML = `
      <div class="dice-result">
        <div class="dice-formula">${formula}</div>
        <div class="dice-tooltip-collapser">
          <div class="dice-tooltip">
            ${tooltipContents}
          </div>
        </div>
        <h4 class="dice-total">${total}</h4>
      </div>
    `;
    html.querySelector(".message-content").appendChild(roll);

    const damageOnSave = this.getFlag("dnd5e", "roll.damageOnSave");
    if ( damageOnSave ) {
      const p = document.createElement("p");
      p.classList.add("supplement");
      p.innerHTML = `<strong>${game.i18n.format("DND5E.SAVE.OnSave")}</strong> ${
        game.i18n.localize(`DND5E.SAVE.FIELDS.damage.onSave.${damageOnSave.capitalize()}`)
      }`;
      html.querySelector(".chat-card, .message-content")?.appendChild(p);
    }

    if ( game.user.isGM ) {
      const damageApplication = document.createElement("damage-application");
      damageApplication.damages = aggregateDamageRolls(rolls, { respectProperties: true }).map(roll => ({
        value: Math.max(0, roll.total),
        type: roll.options.type,
        properties: new Set(roll.options.properties ?? [])
      }));
      html.querySelector(".message-content").appendChild(damageApplication);
    }
  }

  /* -------------------------------------------- */

  /**
   * Simplify damage roll information for use by damage tooltip.
   * @param {DamageRoll} roll   The damage roll to simplify.
   * @returns {object}          The object holding simplified damage roll data.
   * @protected
   */
  _simplifyDamageRoll(roll) {
    const aggregate = { type: roll.options.type, total: Math.max(0, roll.total), constant: 0, dice: [] };
    let hasMultiplication = false;
    for ( let i = roll.terms.length - 1; i >= 0; ) {
      const term = roll.terms[i--];
      if ( !(term instanceof foundry.dice.terms.NumericTerm) && !(term instanceof foundry.dice.terms.DiceTerm) ) {
        continue;
      }
      const value = term.total;
      if ( term instanceof foundry.dice.terms.DiceTerm ) aggregate.dice.push(...term.results.map(r => ({
        result: term.getResultLabel(r), classes: term.getResultCSS(r).filterJoin(" ")
      })));
      let multiplier = 1;
      let operator = roll.terms[i];
      while ( operator instanceof foundry.dice.terms.OperatorTerm ) {
        if ( !["+", "-"].includes(operator.operator) ) hasMultiplication = true;
        if ( operator.operator === "-" ) multiplier *= -1;
        operator = roll.terms[--i];
      }
      if ( term instanceof foundry.dice.terms.NumericTerm ) aggregate.constant += value * multiplier;
    }
    if ( hasMultiplication ) aggregate.constant = null;
    return aggregate;
  }

  /* -------------------------------------------- */

  /**
   * Display the enrichment application interface if necessary.
   * @param {HTMLLIElement} html   The chat card.
   * @protected
   */
  _enrichEnchantmentTooltip(html) {
    const enchantmentProfile = this.getFlag("dnd5e", "use.enchantmentProfile");
    if ( !enchantmentProfile ) return;

    // Ensure concentration is still being maintained
    const concentrationId = this.getFlag("dnd5e", "use.concentrationId");
    if ( concentrationId && !this.getAssociatedActor()?.effects.get(concentrationId) ) return;

    // Create the enchantment tray
    const enchantmentApplication = document.createElement("enchantment-application");
    const afterElement = html.querySelector(".card-footer");
    if ( afterElement ) afterElement.insertAdjacentElement("beforebegin", enchantmentApplication);
    else html.querySelector(".chat-card")?.append(enchantmentApplication);
  }

  /* -------------------------------------------- */

  /**
   * Display option to resist a failed save using a legendary resistance.
   * @param {HTMLLIElement} html  The chat card.
   * @protected
   */
  _enrichSaveTooltip(html) {
    const actor = this.getAssociatedActor();
    const roll = this.getFlag("dnd5e", "roll");
    if ( (actor?.type !== "npc") || (roll?.type !== "save") || this.rolls.some(r => r.isSuccess) ) return;

    const content = document.createElement("div");
    content.classList.add("chat-card");

    // If message has the `forceSuccess` flag, mark it as resisted
    if ( roll.forceSuccess ) content.insertAdjacentHTML("beforeend", `
      <p class="supplement">
        <strong>${game.i18n.localize("DND5E.ROLL.Status")}</strong>
        ${game.i18n.localize("DND5E.LegendaryResistance.Resisted")}
      </p>
    `);

    // Otherwise if actor has legendary resistances remaining, display resist button
    else if ( actor.system.resources.legres.value && actor.isOwner ) {
      content.insertAdjacentHTML("beforeend", `
        <div class="card-buttons">
          <button type="button">
            <i class="fa-solid fa-dragon" inert></i>
            ${game.i18n.localize("DND5E.LegendaryResistance.Action.Resist")}
          </button>
        </div>
      `);
      const button = content.querySelector("button");
      button.addEventListener("click", () => actor.system.resistSave(this));
    }

    else return;

    html.querySelector(".message-content").append(content);
  }

  /* -------------------------------------------- */

  /**
   * Display the effects tray with effects the user can apply.
   * @param {HTMLLiElement} html  The chat card.
   * @protected
   */
  _enrichUsageEffects(html) {
    if ( this.getFlag("dnd5e", "messageType") !== "usage" ) return;
    const item = this.getAssociatedItem();
    const effects = this.getFlag("dnd5e", "use.effects")
      ?.map(id => item?.effects.get(id))
      .filter(e => e && (game.user.isGM || (e.transfer && (this.author.id === game.user.id))));
    if ( !effects?.length ) return;

    const effectApplication = document.createElement("effect-application");
    effectApplication.effects = effects;
    html.querySelector(".message-content").appendChild(effectApplication);
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
    const canApply = li => game.messages.get(li.dataset.messageId)?.canApplyDamage;
    const canTarget = li => game.messages.get(li.dataset.messageId)?.canSelectTargets;
    options.push(
      {
        name: game.i18n.localize("DND5E.ChatContextDamage"),
        icon: '<i class="fas fa-user-minus"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.dataset.messageId)?.applyChatCardDamage(li, 1),
        group: "damage"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextHealing"),
        icon: '<i class="fas fa-user-plus"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.dataset.messageId)?.applyChatCardDamage(li, -1),
        group: "damage"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextTempHP"),
        icon: '<i class="fas fa-user-clock"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.dataset.messageId)?.applyChatCardTemp(li),
        group: "damage"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextDoubleDamage"),
        icon: '<i class="fas fa-user-injured"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.dataset.messageId)?.applyChatCardDamage(li, 2),
        group: "damage"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextHalfDamage"),
        icon: '<i class="fas fa-user-shield"></i>',
        condition: canApply,
        callback: li => game.messages.get(li.dataset.messageId)?.applyChatCardDamage(li, 0.5),
        group: "damage"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextSelectHit"),
        icon: '<i class="fas fa-bullseye"></i>',
        condition: canTarget,
        callback: li => game.messages.get(li.dataset.messageId)?.selectTargets(li, "hit"),
        group: "attack"
      },
      {
        name: game.i18n.localize("DND5E.ChatContextSelectMiss"),
        icon: '<i class="fas fa-bullseye"></i>',
        condition: canTarget,
        callback: li => game.messages.get(li.dataset.messageId)?.selectTargets(li, "miss"),
        group: "attack"
      }
    );
    return options;
  }

  /* -------------------------------------------- */

  /**
   * Add event listeners for chat messages created from activities.
   * @param {HTMLElement} html  The chat message HTML.
   */
  _activateActivityListeners(html) {
    this.getAssociatedActivity()?.activateChatListeners(this, html);
  }

  /* -------------------------------------------- */

  /**
   * Handle target selection and panning.
   * @param {Event} event   The triggering event.
   * @returns {Promise}     A promise that resolves once the canvas pan has completed.
   * @protected
   */
  async _onTargetMouseDown(event) {
    event.stopPropagation();
    const uuid = event.currentTarget.dataset.uuid;
    const actor = fromUuidSync(uuid);
    const token = actor?.token?.object ?? actor?.getActiveTokens()[0];
    if ( !token || !actor.testUserPermission(game.user, "OBSERVER")) return;
    const releaseOthers = !event.shiftKey;
    if ( token.controlled ) token.release();
    else {
      token.control({ releaseOthers });
      return canvas.animatePan(token.center);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering over a target in an attack roll message.
   * @param {Event} event     Initiating hover event.
   * @protected
   */
  _onTargetHoverIn(event) {
    const uuid = event.currentTarget.dataset.uuid;
    const actor = fromUuidSync(uuid);
    const token = actor?.token?.object ?? actor?.getActiveTokens()[0];
    if ( token && token.isVisible ) {
      if ( !token.controlled ) token._onHoverIn(event, { hoverOutOthers: true });
      this._highlighted = token;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle hovering out of a target in an attack roll message.
   * @param {Event} event     Initiating hover event.
   * @protected
   */
  _onTargetHoverOut(event) {
    if ( this._highlighted ) this._highlighted._onHoverOut(event);
    this._highlighted = null;
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
    const damages = aggregateDamageRolls(this.rolls, { respectProperties: true }).map(roll => ({
      value: Math.max(0, roll.total) * (roll.options.type in CONFIG.DND5E.healingTypes ? -1 : 1),
      type: roll.options.type,
      properties: new Set(roll.options.properties ?? [])
    }));
    return Promise.all(canvas.tokens.controlled.map(t => {
      return t.actor?.applyDamage(damages, { multiplier, isDelta: true });
    }));
  }

  /* -------------------------------------------- */

  /**
   * Select the hit or missed targets.
   * @param {HTMLElement} li    The chat entry which contains the roll data.
   * @param {string} type       The type of selection ('hit' or 'miss').
   */
  selectTargets(li, type) {
    if ( !canvas?.ready ) return;
    const lis = li.closest("[data-message-id]").querySelectorAll(`.evaluation li.target.${type}`);
    const uuids = new Set(Array.from(lis).map(n => n.dataset.uuid));
    canvas.tokens.releaseAll();
    uuids.forEach(uuid => {
      const actor = fromUuidSync(uuid);
      if ( !actor ) return;
      const tokens = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
      for ( const token of tokens ) {
        if ( token?.isVisible && actor.testUserPermission(game.user, "OWNER") ) {
          token.control({ releaseOthers: false });
        }
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Apply rolled dice as temporary hit points to the controlled token(s).
   * @param {HTMLElement} li  The chat entry which contains the roll data
   * @returns {Promise}
   */
  applyChatCardTemp(li) {
    const total = this.rolls.reduce((acc, roll) => acc + roll.total, 0);
    return Promise.all(canvas.tokens.controlled.map(t => {
      return t.actor?.applyTempHP(total);
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
  }

  /* -------------------------------------------- */

  /**
   * Handle rendering a chat popout.
   * @param {ChatPopout} app  The ChatPopout Application instance.
   * @param {jQuery} html     The rendered Application HTML.
   */
  static onRenderChatPopout(app, html) {
    html = html instanceof HTMLElement ? html : html[0];
    if ( game.user.isGM ) html.dataset.gmUser = "";
    const close = html.querySelector(".header-button.close");
    if ( close ) {
      close.innerHTML = '<i class="fas fa-times"></i>';
      close.dataset.tooltip = game.i18n.localize("Close");
      close.setAttribute("aria-label", close.dataset.tooltip);
    }
    html.querySelector(".message-metadata [data-context-menu]")?.remove();
  }

  /* -------------------------------------------- */

  /**
   * Wait to apply appropriate element heights until after the chat log has completed its initial batch render.
   * @param {HTMLElement|jQuery} html
   */
  static onRenderChatLog(html) {
    if ( game.user.isGM ) {
      html.dataset.gmUser = "";
      const notifications = document.getElementById("chat-notifications");
      if ( notifications ) notifications.dataset.gmUser = "";
    }
    if ( !game.settings.get("dnd5e", "autoCollapseItemCards") ) {
      requestAnimationFrame(() => {
        // FIXME: Allow time for transitions to complete. Adding a transitionend listener does not appear to work, so
        // the transition time is hard-coded for now.
        setTimeout(() => ui.chat.scrollBottom(), 250);
      });
    }
  }

  /* -------------------------------------------- */

  /**
   * Listen for shift key being pressed to show the chat message "delete" icon, or released (or focus lost) to hide it.
   */
  static activateListeners() {
    window.addEventListener("keydown", this.toggleModifiers, { passive: true });
    window.addEventListener("keyup", this.toggleModifiers, { passive: true });
    window.addEventListener("blur", () => this.toggleModifiers({ releaseAll: true }), { passive: true });
  }

  /* -------------------------------------------- */

  /**
   * Toggles attributes on the chatlog based on which modifier keys are being held.
   * @param {object} [options]
   * @param {boolean} [options.releaseAll=false]  Force all modifiers to be considered released.
   */
  static toggleModifiers({ releaseAll=false }={}) {
    const MODIFIER_KEYS = (foundry.helpers?.interaction?.KeyboardManager ?? KeyboardManager).MODIFIER_KEYS;
    document.querySelectorAll(".chat-sidebar > ol, #chat .chat-scroll > ol").forEach(chatlog => {
      for ( const key of Object.values(MODIFIER_KEYS) ) {
        if ( game.keyboard.isModifierActive(key) && !releaseAll ) chatlog.dataset[`modifier${key}`] = "";
        else delete chatlog.dataset[`modifier${key}`];
      }
    });
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( !foundry.utils.hasProperty(data, "flags.core.canPopout") ) {
      this.updateSource({ "flags.core.canPopout": true });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    dnd5e.registry.messages.untrack(this);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Get the Activity that created this chat card.
   * @returns {Activity|void}
   */
  getAssociatedActivity() {
    const activity = fromUuidSync(this.getFlag("dnd5e", "activity.uuid"), { strict: false });
    if ( activity ) return activity;
    return this.getAssociatedItem()?.system.activities?.get(this.getFlag("dnd5e", "activity.id"));
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card.
   * @returns {Actor|void}
   */
  getAssociatedActor() {
    if ( this.speaker.scene && this.speaker.token ) {
      const scene = game.scenes.get(this.speaker.scene);
      const token = scene?.tokens.get(this.speaker.token);
      if ( token ) return token.actor;
    }
    return game.actors.get(this.speaker.actor);
  }

  /* -------------------------------------------- */

  /**
   * Get the item associated with this chat card.
   * @returns {Item5e|void}
   */
  getAssociatedItem() {
    const item = fromUuidSync(this.getFlag("dnd5e", "item.uuid"), { strict: false });
    if ( item ) return item;
    const actor = this.getAssociatedActor();
    if ( !actor ) return;
    const storedData = this.getFlag("dnd5e", "item.data") ?? this.getOriginatingMessage().getFlag("dnd5e", "item.data");
    if ( storedData ) return new Item.implementation(storedData, { parent: actor });
  }

  /* -------------------------------------------- */

  /**
   * Get a list of all chat messages containing rolls that originated from this message.
   * @param {string} [type]  Type of rolls to get. If empty, all roll types will be fetched.
   * @returns {ChatMessage5e[]}
   */
  getAssociatedRolls(type) {
    return dnd5e.registry.messages.get(this.id, type);
  }

  /* -------------------------------------------- */

  /**
   * Get the original chat message from which this message was created. If no originating message exists,
   * will return this message.
   * @type {ChatMessage5e}
   */
  getOriginatingMessage() {
    return game.messages.get(this.getFlag("dnd5e", "originatingMessage")) ?? this;
  }
}
