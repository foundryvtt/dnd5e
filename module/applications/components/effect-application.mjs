import ActiveEffect5e from "../../documents/active-effect.mjs";
import { convertTime, formatTime, loadingTooltip } from "../../utils.mjs";
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
   * The HTML tag named used by this element.
   * @type {string}
   */
  static tagName = "effect-application";

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
   * Checked status for effects.
   * @type {Map<string, boolean>}
   */
  #effectOptions = new Map();

  /* -------------------------------------------- */

  /**
   * Target pills grouped by their grouping keys.
   * @type {Record<string, TargetPillElement>}
   */
  #targetGroups;

  /* -------------------------------------------- */

  /**
   * Checked status for application targets.
   * @type {Map<string, boolean>}
   */
  #targetOptions = new Map();

  /* -------------------------------------------- */

  /**
   * Checked status for the given effect.
   * @param {string} uuid  UUID of the effect.
   * @returns {boolean}
   */
  effectChecked(uuid) {
    return this.#effectOptions.get(uuid) ?? false;
  }

  /* -------------------------------------------- */

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

  /** @override */
  connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.effectsList || !this.targetList ) {
      let effectPromise;
      if ( !this.effects.length ) effectPromise = Promise.all(
        Array.from(this.querySelectorAll("option")).map(o => fromUuid(o.value))
      ).then(p => this.effects = p.filter(_ => _));

      const div = document.createElement("div");
      div.classList.add("card-tray", "effects-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-bolt"></i>
          <span>${_loc("DND5E.EFFECT.Application.Header")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <menu class="effects unlist"></menu>
            <button type="button" class="apply-button" data-action="apply">
              <i class="fa-solid fa-reply-all fa-flip-horizontal" inert></i>
              <span>${_loc("DND5E.EFFECT.Action.Apply")}</span>
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.effectsList = div.querySelector(".effects");
      if ( effectPromise ) effectPromise.then(() => this.buildEffectsList());
      else this.buildEffectsList();
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      this.targetList.addEventListener("change", this._onCheckTarget.bind(this));
      this.effectsList.addEventListener("click", this._onCheckEffect.bind(this));
      div.addEventListener("click", this._handleClickHeader.bind(this));
      div.querySelector(".apply-button").addEventListener("click", this._onApplyEffects.bind(this));
    }

    this.targetingMode = "targeted";
  }

  /* -------------------------------------------- */

  /**
   * Build a list of active effects.
   */
  buildEffectsList() {
    if ( this.effects.length && foundry.utils.isEmpty(this.#effectOptions) ) {
      this.#effectOptions.set(this.effects[0].uuid, true);
    }
    for ( const effect of this.effects ) {
      effect.updateDuration();
      const { icon, label } = this.#formatDuration(effect);
      const li = document.createElement("li");
      li.classList.add("effect");
      Object.assign(li.dataset, {
        id: effect.id,
        tooltipHtml: loadingTooltip({ uuid: effect.uuid }),
        tooltipClass: "dnd5e2 dnd5e-tooltip item-tooltip",
        tooltipDirection: "LEFT",
        uuid: effect.uuid
      });
      li.innerHTML = `
        <button type="button" class="unbutton" aria-pressed="${this.effectChecked(effect.uuid)}">
          <img class="gold-icon">
          <span class="title"></span>
          <span class="duration pill transparent">
            <i class="fa-solid ${icon}" inert></i>
            <span>${label}</span>
          </span>
          <span class="pip" inert></span>
        </button>
      `;
      Object.assign(li.querySelector(".gold-icon"), { alt: effect.name, src: effect.img });
      li.querySelector(".title").append(effect.name);
      this.effectsList.append(li);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  buildTargetContainer() {
    const [control, list] = super.buildTargetContainer();
    const row = document.createElement("section");
    row.classList.add("icon-row");
    row.append(control, list);
    list.classList.add("pills");
    return [row];
  }

  /* -------------------------------------------- */

  /** @override */
  buildTargetListEntry({ uuid, name }) {
    const token = fromUuidSync(uuid);
    if ( !token?.isOwner ) return;

    const key = token.getGroupingKey() ?? token.uuid;
    let group = this.#targetGroups[key];
    const isGrouped = group;

    if ( !group ) {
      group = document.createElement("target-pill");
      group.insertAdjacentHTML("afterbegin", "<label></label><datalist></datalist>");
      group.querySelector("label").append(name);
      group.disabled = this.targetingMode === "selected";
    }

    const option = document.createElement("option");
    option.value = token.uuid;
    option.toggleAttribute("data-checked", this.targetChecked(token.uuid));
    option.append(name);
    const data = group.querySelector("datalist");
    data.append(option);
    const count = data.children.length;
    group.querySelector("label").textContent = count > 1
      ? _loc("DND5E.CHATMESSAGE.Targets.Count", { name, number: count })
      : name;
    this.#targetGroups[key] = group;

    return isGrouped ? null : group;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  buildTargetsList() {
    this.#targetGroups = {};
    return super.buildTargetsList();
  }

  /* -------------------------------------------- */

  /** @override */
  _buildTargetSourceControl() {
    const control = document.createElement("button");
    control.type = "button";
    control.classList.add("unbutton", "control-button", "target-source-toggle");
    control.toggleAttribute("data-tooltip", true);
    control.addEventListener("click", this._onChangeTargetMode.bind(this));
    return control;
  }

  /* -------------------------------------------- */

  /** @override */
  _refreshTargetMode() {
    const targeted = this.targetingMode === "targeted";
    this.targetSourceControl.dataset.mode = this.targetingMode;
    this.targetSourceControl.ariaLabel = _loc(`DND5E.Tokens.${targeted ? "Targeted" : "Selected"}`);
    this.targetSourceControl.disabled = !this.hasRecordedTargets;
  }

  /* -------------------------------------------- */

  /**
   * Abbreviate an effect's duration, using the most significant unit that can represent it.
   * @param {ActiveEffect5e} effect              The effect being displayed.
   * @returns {{ icon: string, label: string }}  Icon and label to display.
   */
  #formatDuration(effect) {
    const special = effect.getSpecialDurationParts();
    if ( special ) return special;
    const { label, units, value } = effect.duration;
    if ( !Number.isFinite(value) || !units ) return { icon: "fa-clock", label };
    const from = units.replace(/s$/, "");
    const { unit, value: converted } = CONFIG.DND5E.timeUnits[from]?.combat
      ? { value, unit: from }
      : convertTime(value, from, { truncate: true });
    return { icon: "fa-clock", label: formatTime(converted, unit, { unitDisplay: "narrow" }) };
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
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
    const { action, data } = await this._prepareEffectData(effect, actor);
    if ( action === "update" ) return actor.effects.get(data._id).update(data);
    return ActiveEffect.implementation.create(data, { parent: actor });
  }

  /* -------------------------------------------- */

  /**
   * Prepare the data for applying an Active Effect to an Actor.
   * @param {ActiveEffect5e} effect  The effect to apply.
   * @param {Actor5e} actor          The actor.
   * @returns {Promise<{ action: "create"|"update", data: object }>}
   * @throws {Error}
   * @protected
   */
  async _prepareEffectData(effect, actor) {
    const originActor = this.chatMessage.getAssociatedActor();
    const concentration = originActor?.effects.get(this.chatMessage.system.concentration);
    const item = this.chatMessage.getAssociatedItem();
    const activity = this.chatMessage.getAssociatedActivity({ scaled: true });
    const origin = concentration ?? (effect.inCompendium && item ? item : effect);
    if ( !game.user.isGM && !actor.isOwner ) {
      throw new Error(_loc("DND5E.EFFECT.Application.Warning.Ownership"));
    }

    const effectFlags = {
      flags: {
        dnd5e: {
          dependentOn: concentration?.uuid,
          scaling: this.chatMessage.system.scaling,
          spellLevel: this.chatMessage.system.level
        }
      }
    };

    // Inherit the activity's duration only when the applied effect has a duration expiry and  no explicit duration of
    // its own.
    let durationOverride = {};
    if ( !Number.isFinite(effect.duration.value) && effect.expirySupportsDuration() ) {
      const effectDuration = activity?.duration.getEffectData();
      if ( !foundry.utils.isEmpty(effectDuration) ) durationOverride = { duration: effectDuration };
    }

    // Enable an existing effect on the target if it originated from this effect
    const existingEffect = effect.inCompendium
      ? actor.effects.find(e => e._stats.compendiumSource === effect.uuid)
      : actor.effects.find(e => e.origin === origin.uuid);
    if ( existingEffect ) {
      return { action: "update", data: foundry.utils.mergeObject({
        ...durationOverride,
        _id: existingEffect.id,
        disabled: false,
        start: effect.constructor.getEffectStart()
      }, effectFlags) };
    }

    if ( !game.user.isGM && concentration && !concentration.isOwner ) {
      throw new Error(_loc("DND5E.EFFECT.Application.Warning.Concentration"));
    }

    // Otherwise, create a new effect on the target
    const effectData = foundry.utils.mergeObject({
      ...effect.toObject(),
      ...durationOverride,
      disabled: false,
      transfer: false,
      origin: origin.uuid,
      _stats: {
        [effect.inCompendium ? "compendiumSource" : "duplicateSource"]: effect.uuid,
        [effect.inCompendium ? "duplicateSource" : "compendiumSource"]: null
      }
    }, effectFlags);

    effectData.system.changes = await ActiveEffect5e.forApplication(
      effectData.system.changes,
      activity ?? item ?? originActor,
      actor
    );

    return { action: "create", data: effectData };
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle applying selected effects to the appropriate targets.
   * @protected
   */
  async _onApplyEffects() {
    const effects = this.effects.filter(e => this.effectChecked(e.uuid));
    const operations = [];
    for ( const option of this.targetList.querySelectorAll("option[data-checked]") ) {
      const doc = await fromUuid(option.value);
      const actor = doc?.actor ?? doc;
      if ( !actor ) continue;
      const data = [];
      const updates = [];
      for ( const effect of effects ) {
        try {
          const operation = await this._prepareEffectData(effect, actor);
          (operation.action === "create" ? data : updates).push(operation.data);
        } catch ( err ) {
          Hooks.onError("EffectApplicationElement._prepareEffectData", err, { notify: "warn", log: "warn" });
        }
      }
      if ( data.length ) operations.push({ data, action: "create", documentName: "ActiveEffect", parent: actor });
      if ( updates.length ) {
        operations.push({ updates, action: "update", documentName: "ActiveEffect", parent: actor });
      }
    }
    if ( operations.length ) await foundry.documents.modifyBatch(operations);
    if ( game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual" ) {
      this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
    }
  }

  /* -------------------------------------------- */

  /** @override */
  _onChangeTargetMode(event) {
    event.preventDefault();
    this.targetingMode = this.targetingMode === "targeted" ? "selected" : "targeted";
  }

  /* -------------------------------------------- */

  /**
   * Handle checking or unchecking an effect.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onCheckEffect(event) {
    const effect = event.target.closest(".effect[data-uuid]");
    if ( !effect ) return;
    event.stopPropagation();
    const { uuid } = effect.dataset;
    const checked = this.#effectOptions.get(uuid);
    if ( !event.shiftKey ) this.#effectOptions.clear();
    this.#effectOptions.set(uuid, event.shiftKey ? !checked : true);
    this.querySelectorAll(".effect[data-uuid]").forEach(el => {
      el.querySelector("button").ariaPressed = `${this.#effectOptions.get(el.dataset.uuid) ?? false}`;
    });
  }

  /* -------------------------------------------- */

  /**
   * Handle checking or unchecking a target.
   * @param {Event} event  Triggering change event.
   */
  _onCheckTarget(event) {
    this.#targetOptions = new Map(Iterator.from(event.currentTarget.querySelectorAll(".target option"))
      .map(el => [el.value, "checked" in el.dataset]));
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
