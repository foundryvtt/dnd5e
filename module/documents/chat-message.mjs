import aggregateDamageRolls from "../dice/aggregate-damage-rolls.mjs";
import TargetsField from "../data/chat-message/fields/targets-field.mjs";

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
    if ( this.system?.canApplyDamage === false ) return false;
    return this.isRoll && this.isContentVisible && !!canvas.tokens?.controlled.length;
  }

  /* -------------------------------------------- */

  /**
   * Should the select targets options appear?
   * @type {boolean}
   */
  get canSelectTargets() {
    if ( this.type !== "attack" ) return false;
    return this.isRoll && this.isContentVisible;
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
      case "player": return !this.author?.isGM;
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
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    source = super.migrateData(source);
    const legacy = source.flags?.dnd5e;
    if ( !legacy ) return source;

    // The snapshot of a deleted item is kept alongside every other deleted item.
    const snapshot = legacy.itemData ?? legacy.item?.data;
    if ( snapshot ) {
      const deleted = foundry.utils.getProperty(source, "system.deltas.deleted") ?? [];
      if ( !deleted.some(i => i._id === snapshot._id) ) deleted.push(snapshot);
      foundry.utils.setProperty(source, "system.deltas.deleted", deleted);
      delete legacy.itemData;
      delete legacy.item?.data;
    }

    if ( legacy.use ) {
      const { itemId, itemUuid, type } = legacy.use;
      if ( type ) foundry.utils.setProperty(source, "system.item.type", type);
      if ( itemId ) foundry.utils.setProperty(source, "system.item.id", itemId);
      if ( itemUuid ) foundry.utils.setProperty(source, "system.item.uuid", itemUuid);
    }

    return source;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareData() {
    super.prepareData();
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
    } else {
      if ( game.settings.get("dnd5e", "autoCollapseItemCards") ) {
        html.querySelectorAll(".description.collapsible").forEach(el => el.classList.add("collapsed"));
      }

      await this._enrichChatCard(html);
      this._collapseTrays(html);
    }

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
   * Augment the chat card markup for additional styling.
   * @param {HTMLElement} html  The chat card markup.
   * @protected
   */
  async _enrichChatCard(html) {
    html.querySelectorAll(".dnd5e2").forEach(el => el.classList.remove("dnd5e2")); // Legacy
    html.classList.add("dnd5e2");

    // Header matter
    const token = this.getAssociatedToken();
    const actor = this.getAssociatedActor();
    const avatar = document.createElement("a");
    avatar.classList.add("avatar");
    let avatarImg = document.createElement("img");

    let img;
    let nameText;
    if ( this.isContentVisible ) {
      const artworkData = await actor?.getPreferredArtwork();
      img = artworkData?.src ?? this.author?.avatar;
      nameText = this.alias;
      if ( artworkData?.isToken ) avatar.classList.add("token");
      if ( artworkData?.isVideo ) {
        avatarImg = document.createElement("video");
        avatarImg.toggleAttribute("autoplay", true);
        avatarImg.toggleAttribute("muted", true);
        avatarImg.toggleAttribute("disablepictureinpicture", true);
        avatarImg.toggleAttribute("loop", true);
        avatarImg.toggleAttribute("playsinline", true);
      }
    } else {
      img = this.author?.avatar;
      nameText = this.author?.name ?? "";
    }
    img ??= CONST.DEFAULT_TOKEN;

    if ( actor ) avatar.dataset.actorUuid = actor.uuid;
    if ( token ) avatar.dataset.tokenUuid = token.uuid;
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
    anchor.setAttribute("aria-label", _loc("DND5E.AdditionalControls"));
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

    // Dice rolls
    if ( this.isContentVisible ) {
      html.querySelectorAll(".dice-roll").forEach(el => el.addEventListener("click", this._onClickDiceRoll.bind(this)));
    } else {
      html.querySelectorAll(".dice-roll").forEach(el => el.classList.add("secret-roll"));
    }

    avatar.addEventListener("click", this._onTargetMouseDown.bind(this));
    avatar.addEventListener("pointerover", this._onTargetHoverIn.bind(this));
    avatar.addEventListener("pointerout", this._onTargetHoverOut.bind(this));
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
        label: _loc("DND5E.ChatContextDamage"),
        icon: "fa-solid fa-user-minus",
        group: "damage",
        visible: canApply,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.applyChatCardDamage(target, 1)
      },
      {
        label: _loc("DND5E.ChatContextHealing"),
        icon: "fa-solid fa-user-plus",
        group: "damage",
        visible: canApply,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.applyChatCardDamage(target, -1)
      },
      {
        label: _loc("DND5E.ChatContextTempHP"),
        icon: "fa-solid fa-user-clock",
        group: "damage",
        visible: canApply,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.applyChatCardTemp(target)
      },
      {
        label: _loc("DND5E.ChatContextDoubleDamage"),
        icon: "fa-solid fa-user-injured",
        group: "damage",
        visible: canApply,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.applyChatCardDamage(target, 2)
      },
      {
        label: _loc("DND5E.ChatContextHalfDamage"),
        icon: "fa-solid fa-user-shield",
        group: "damage",
        visible: canApply,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.applyChatCardDamage(target, 0.5)
      },
      {
        label: _loc("DND5E.ChatContextSelectHit"),
        icon: "fa-solid fa-bullseye",
        group: "attack",
        visible: canTarget,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.selectTargets(target, "hit")
      },
      {
        label: _loc("DND5E.ChatContextSelectMiss"),
        icon: "fa-solid fa-bullseye",
        group: "attack",
        visible: canTarget,
        onClick: (_, target) => game.messages.get(target.dataset.messageId)?.selectTargets(target, "miss")
      }
    );
    return options;
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
    const { actorUuid, tokenUuid } = event.currentTarget.dataset;
    const { actor, token } = TargetsField.resolve({ actor: actorUuid, token: tokenUuid });
    if ( !token || !actor?.testUserPermission(game.user, "OBSERVER") ) return;
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
    const { actorUuid, tokenUuid } = event.currentTarget.dataset;
    const { token } = TargetsField.resolve({ actor: actorUuid, token: tokenUuid });
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
      return t.actor?.applyDamage(damages, { multiplier, isDelta: true, originatingMessage: this });
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
    canvas.tokens.releaseAll();
    for ( const { dataset } of lis ) {
      const { actor, token } = TargetsField.resolve({ actor: dataset.actorUuid, token: dataset.tokenUuid });
      if ( token?.isVisible && actor?.testUserPermission(game.user, "OWNER") ) {
        token.control({ releaseOthers: false });
      }
    }
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
   * @param {ChatPopout} app    The ChatPopout Application instance.
   * @param {HTMLElement} html  The rendered Application HTML.
   */
  static onRenderChatPopout(app, html) {
    if ( game.user.isGM ) html.dataset.gmUser = "";
    const close = html.querySelector(".header-button.close");
    if ( close ) {
      close.innerHTML = '<i class="fas fa-times"></i>';
      close.dataset.tooltip = _loc("Close");
      close.setAttribute("aria-label", close.dataset.tooltip);
    }
    html.querySelector(".message-metadata [data-context-menu]")?.remove();
  }

  /* -------------------------------------------- */

  /**
   * Wait to apply appropriate element heights until after the chat log has completed its initial batch render.
   * @param {HTMLElement} html
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
   * @param {object} [options={}]
   * @param {boolean} [scaled=false]  Pre-scaled the item based on the scaling value on the chat card.
   * @returns {Activity|void}
   */
  getAssociatedActivity({ scaled=false }={}) {
    const uuid = this.system.activity?.uuid ?? this.getFlag("dnd5e", "activity.uuid");
    const activity = fromUuidSync(uuid, { strict: false });
    if ( activity ) {
      const scaling = scaled ? this.system.scaling : null;
      return scaling ? activity.item.scaledClone(scaling).system.activities.get(activity.id) : activity;
    }
    const id = this.system.activity?.id ?? this.getFlag("dnd5e", "activity.id");
    return this.getAssociatedItem({ scaled })?.system.activities?.get(id);
  }

  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card.
   * @returns {Actor|void}
   */
  getAssociatedActor() {
    return this.getAssociatedToken()?.actor ?? game.actors.get(this.speaker.actor);
  }

  /* -------------------------------------------- */

  /**
   * Get the item associated with this chat card.
   * @param {object} [options={}]
   * @param {boolean} [scaled=false]  Pre-scaled the item based on the scaling value on the chat card.
   * @returns {Item5e|void}
   */
  getAssociatedItem({ scaled=false }={}) {
    const uuid = this.system.item?.uuid ?? this.getFlag("dnd5e", "item.uuid");
    const item = fromUuidSync(uuid, { strict: false });
    const scaling = scaled ? this.system.scaling : null;
    if ( item ) return scaling ? item.scaledClone(scaling) : item;
    const actor = this.getAssociatedActor();
    if ( !actor ) return;
    const storedData = this.#getStoredItemData() ?? this.getOriginatingMessage().#getStoredItemData();
    if ( storedData ) return new Item.implementation(storedData, { parent: actor }).scaledClone(scaling);
  }

  /* -------------------------------------------- */

  /**
   * Retrieve the snapshot taken of this card's item if it has since been deleted.
   * @returns {object|void}
   */
  #getStoredItemData() {
    const id = this.system.item?.id ?? this.getFlag("dnd5e", "item.id");
    return this.system.deltas?.deleted?.find(i => i._id === id) ?? this.getFlag("dnd5e", "item.data");
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
   * Get the token which is the speaker of a chat card.
   * @returns {TokenDocument5e|void}
   */
  getAssociatedToken() {
    const { scene, token } = this.speaker;
    if ( scene && token ) return game.scenes.get(scene)?.tokens.get(token);
  }

  /* -------------------------------------------- */

  /**
   * Get the original chat message from which this message was created. If no originating message exists,
   * will return this message.
   * @type {ChatMessage5e}
   */
  getOriginatingMessage() {
    return this.system.origin ?? game.messages.get(this.getFlag("dnd5e", "originatingMessage")) ?? this;
  }
}
