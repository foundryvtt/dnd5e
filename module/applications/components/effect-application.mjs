import ChatTrayElement from "./chat-tray-element.mjs";
import TargetedApplicationMixin from "./targeted-application-mixin.mjs";

/**
 * Application to handle applying active effects from a chat card.
 */
export default class EffectApplicationElement extends TargetedApplicationMixin(ChatTrayElement) {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The chat message with which this application is associated.
   * @type {ChatMessage5e}
   */
  chatMessage;

  /* -------------------------------------------- */

  /**
   * Active effects that will be applied by this application.
   * @type {ActiveEffect5e[]}
   */
  effects = [];

  /* -------------------------------------------- */

  /**
   * The list of active effects.
   * @type {HTMLUListElement}
   */
  effectsList;

  /* -------------------------------------------- */

  /** @override */
  get shouldBuildTargetList() {
    return super.shouldBuildTargetList && this.open && this.visible;
  }

  /* -------------------------------------------- */

  /**
   * Checked status for application targets.
   * @type {Map<string, boolean>}
   */
  #targetOptions = new Map();

  /**
   * Options for a specific target.
   * @param {string} uuid  UUID of the target.
   * @returns {boolean}    Should this target be checked?
   */
  targetChecked(uuid) {
    if ( this.targetingMode === "selected" ) return true;
    return this.#targetOptions.get(uuid) ?? true;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.effectsList || !this.targetList ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "effects-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-bolt"></i>
          <span>${game.i18n.localize("DND5E.Effects")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <hr>
            <menu class="effects unlist"></menu>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.effectsList = div.querySelector(".effects");
      this.buildEffectsList();
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      this.targetList.addEventListener("change", this._onCheckTarget.bind(this));
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }

    this.targetingMode = this.targetSourceControl.hidden ? "selected" : "targeted";
  }

  /* -------------------------------------------- */

  /**
   * Build a list of active effects.
   */
  buildEffectsList() {
    for ( const effect of this.effects ) {
      effect.updateDuration();
      const li = document.createElement("li");
      li.classList.add("effect");
      li.dataset.id = effect.id;
      li.innerHTML = `
        <img class="gold-icon">
        <div class="name-stacked">
          <span class="title"></span>
          <span class="subtitle">${effect.duration.label}</span>
        </div>
        <button class="apply-effect" type="button" data-action="applyEffect"
                data-tooltip aria-label="${game.i18n.localize("DND5E.EffectsApplyTokens")}">
          <i class="fas fa-reply-all fa-flip-horizontal" inert></i>
        </button>
      `;
      Object.assign(li.querySelector(".gold-icon"), { alt: effect.name, src: effect.img });
      li.querySelector(".name-stacked .title").append(effect.name);
      this.effectsList.append(li);
      li.addEventListener("click", this._onApplyEffect.bind(this));
    }
  }

  /* -------------------------------------------- */

  /** @override */
  buildTargetListEntry({ uuid, name }) {
    const actor = fromUuidSync(uuid);
    if ( !actor?.isOwner ) return;

    const disabled = this.targetingMode === "selected" ? " disabled" : "";
    const checked = this.targetChecked(uuid) ? " checked" : "";

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon">
      <div class="name-stacked">
        <span class="title"></span>
      </div>
      <div class="checkbox">
        <dnd5e-checkbox name="${uuid}"${checked}${disabled}></dnd5e-checkbox>
      </div>
    `;
    Object.assign(li.querySelector(".gold-icon"), { alt: name, src: actor.img });
    li.querySelector(".name-stacked .title").append(name);

    return li;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle applying an Active Effect to a Token.
   * @param {ActiveEffect5e} effect      The effect to apply.
   * @param {Actor5e} actor              The actor.
   * @returns {Promise<ActiveEffect5e>}  The created effect.
   * @throws {Error}                     If the effect could not be applied.
   * @protected
   */
  async _applyEffectToActor(effect, actor) {
    const concentration = this.chatMessage.getAssociatedActor()?.effects
      .get(this.chatMessage.getFlag("dnd5e", "use.concentrationId"));
    const origin = concentration ?? effect;
    if ( !game.user.isGM && !actor.isOwner ) {
      throw new Error(game.i18n.localize("DND5E.EffectApplyWarningOwnership"));
    }

    const effectFlags = {
      flags: {
        dnd5e: {
          scaling: this.chatMessage.getFlag("dnd5e", "scaling"),
          spellLevel: this.chatMessage.getFlag("dnd5e", "use.spellLevel")
        }
      }
    };

    // Enable an existing effect on the target if it originated from this effect
    const existingEffect = actor.effects.find(e => e.origin === origin.uuid);
    if ( existingEffect ) {
      return existingEffect.update(foundry.utils.mergeObject({
        ...effect.constructor.getInitialDuration(),
        disabled: false
      }, effectFlags));
    }

    if ( !game.user.isGM && concentration && !concentration.isOwner ) {
      throw new Error(game.i18n.localize("DND5E.EffectApplyWarningConcentration"));
    }

    // Otherwise, create a new effect on the target
    const effectData = foundry.utils.mergeObject({
      ...effect.toObject(),
      disabled: false,
      transfer: false,
      origin: origin.uuid
    }, effectFlags);
    const applied = await ActiveEffect.implementation.create(effectData, { parent: actor });
    if ( concentration ) await concentration.addDependent(applied);
    return applied;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the apply effect button.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onApplyEffect(event) {
    event.preventDefault();
    const effect = this.chatMessage.getAssociatedItem()?.effects.get(event.target.closest("[data-id]")?.dataset.id);
    if ( !effect ) return;
    for ( const target of this.targetList.querySelectorAll("[data-target-uuid]") ) {
      const actor = fromUuidSync(target.dataset.targetUuid);
      if ( !actor || !target.querySelector("dnd5e-checkbox")?.checked ) continue;
      try {
        await this._applyEffectToActor(effect, actor);
      } catch(err) {
        Hooks.onError("EffectApplicationElement._applyEffectToToken", err, { notify: "warn", log: "warn" });
      }
    }
    if ( game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual" ) {
      this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle checking or unchecking a target.
   * @param {Event} event  Triggering change event.
   */
  _onCheckTarget(event) {
    const uuid = event.target.closest("[data-target-uuid]")?.dataset.targetUuid;
    if ( !uuid ) return;
    this.#targetOptions.set(uuid, event.target.checked);
  }

  /* -------------------------------------------- */

  /** @override */
  _onOpen() {
    this.buildTargetsList();
  }

  /* -------------------------------------------- */

  /** @override */
  _onVisible() {
    this.buildTargetsList();
  }
}
