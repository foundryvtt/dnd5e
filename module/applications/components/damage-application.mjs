import aggregateDamageRolls from "../../dice/aggregate-damage-rolls.mjs";
import DamageRoll from "../../dice/damage-roll.mjs";
import { formatNumber } from "../../utils.mjs";
import ChatTrayElement from "./chat-tray-element.mjs";

/**
 * @import { DamageApplicationOptions, DamageCalc, DamageDescription } from "../../documents/_types.mjs";
 * @import { RecordedTargetEntryCallback, TargetPillMenuEntryCallback } from "./_types.mjs";
 * @import RecordedTargetsElement from "./recorded-targets.mjs";
 */

/**
 * List of multiplier options as tuples containing their numeric value and rendered text.
 * @type {[number, string][]}
 */
const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

/**
 * Application to handle applying damage from a chat card.
 */
export default class DamageApplicationElement extends ChatTrayElement {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The HTML tag named used by this element.
   * @type {string}
   */
  static tagName = "damage-application";

  /* -------------------------------------------- */

  /**
   * The apply damage button within the element.
   * @type {HTMLButtonElement}
   */
  applyButton;

  /* -------------------------------------------- */

  /**
   * The chat message with which this damage is associated.
   * @type {ChatMessage5e}
   */
  chatMessage;

  /* -------------------------------------------- */

  /**
   * Damage descriptions that will be applied by this application.
   * @type {DamageDescription[]}
   */
  damages = [];

  /* -------------------------------------------- */

  /**
   * The global multiplier for the whole tray.
   * @type {number}
   */
  multiplier = 1;

  /* -------------------------------------------- */

  /**
   * The container for the targets.
   * @type {RecordedTargetsElement}
   */
  targetList;

  /* -------------------------------------------- */

  /**
   * Stacked target menu states.
   * @type {TargetPillMenuState[]}
   */
  #paneStack = [];

  /* -------------------------------------------- */

  /**
   * The current pane state.
   * @type {TargetPillMenuState}
   */
  #paneState = {
    calc: null,
    group: null,
    options: null,
    targets: []
  };

  /* -------------------------------------------- */

  /**
   * Deferred rebuild microtask.
   * @type {number}
   */
  #rebuild;

  /* -------------------------------------------- */

  /**
   * Options for each application target.
   * @type {Map<string, DamageApplicationOptions>}
   */
  #targetOptions = new Map();

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Calculate the total damage that will be applied to an actor.
   * @param {Actor5e} actor
   * @param {DamageApplicationOptions} options
   * @returns {DamageCalc}
   */
  calculateDamage(actor, options) {
    const damages = actor.calculateDamage(this.damages, options);
    let { amount, temp, tempMax } = damages;

    let active = {
      modification: new Set(), resistance: new Set(), vulnerability: new Set(), immunity: new Set(), threshold: false
    };
    for ( const damage of damages ) {
      for ( const category of Object.keys(active) ) {
        if ( category === "threshold" ) {
          if ( damage.active.threshold ) active.threshold = true;
          continue;
        }
        if ( damage.active.all?.[category] ) active[category].add("ALL");
        if ( damage.active.type?.[category] ) active[category].add(damage.type);
      }
    }
    temp = Math.floor(Math.max(0, temp));

    // Add values from options to prevent active changes from being lost when re-rendering target list
    const union = t => {
      if ( foundry.utils.getType(options.ignore?.[t]) === "Set" ) active[t] = active[t].union(options.ignore[t]);
    };
    union("modification");
    union("resistance");
    union("vulnerability");
    union("immunity");
    if ( foundry.utils.getType(options.downgrade) === "Set" ) {
      active.immunity = active.immunity.union(options.downgrade);
      active.resistance = active.resistance.difference(options.downgrade);
    }
    active.threshold ||= options.ignore?.threshold;

    return { active, temp, tempMax, total: amount };
  }

  /* -------------------------------------------- */

  /**
   * Get a target's options merged with the global options.
   * @param {string} uuid  The target's UUID.
   * @returns {DamageApplicationOptions}
   */
  getMergedOptions(uuid) {
    const options = this.getTargetOptions(uuid);
    return { ...options, multiplier: options.multiplier ?? this.multiplier };
  }

  /* -------------------------------------------- */

  /**
   * Options for a specific target.
   * @param {string} uuid  UUID of the targeted token.
   * @returns {DamageApplicationOptions}
   */
  getTargetOptions(uuid) {
    if ( !this.#targetOptions.has(uuid) ) this.#targetOptions.set(uuid, { originatingMessage: this.chatMessage });
    return this.#targetOptions.get(uuid);
  }

  /* -------------------------------------------- */

  /**
   * Set imm/res/vuln ignore & downgrade.
   * @param {DamageApplicationOptions} options            Options which adjust damage calculation.
   * @param {{ change: string, type: string }} operation  The operation being performed.
   */
  #cycleChangeSource(options, { type, change }={}) {
    if ( change === "immunity" ) {
      if ( options.ignore?.immunity?.has(type) ) {
        options.ignore.immunity.delete(type);
        options.downgrade ??= new Set();
        options.downgrade.add(type);
      } else if ( options.downgrade?.has(type) ) {
        options.downgrade.delete(type);
      } else {
        options.ignore ??= {};
        options.ignore[change] ??= new Set();
        options.ignore[change].add(type);
      }
    }
    else if ( change === "threshold" ) {
      options.ignore ??= {};
      options.ignore.threshold = !options.ignore.threshold;
    }
    else if ( options.ignore?.[change]?.has(type) ) options.ignore[change].delete(type);
    else {
      options.ignore ??= {};
      options.ignore[change] ??= new Set();
      options.ignore[change].add(type);
    }
  }

  /* -------------------------------------------- */

  /**
   * Construct a key that can be used to group targets by shared attributes.
   * @param {TokenDocument5e} token             The token.
   * @param {DamageApplicationOptions} options  Options for applying damage.
   * @param {DamageCalc} damage                 The token's damage calculation.
   * @returns {string}
   */
  #getGroupingKey(token, options, { temp, tempMax, total }) {
    const key = token.getGroupingKey();
    if ( !key ) return token.uuid;
    const set = value => value === true ? "*" : Array.from(value ?? []).sort().join(",");
    const ignore = Object.entries(options.ignore ?? {})
      .sort()
      .map(([change, value]) => `${change}=${set(value)}`)
      .join(";");
    return [key, options.multiplier, total, temp, tempMax, ignore, set(options.downgrade)].join("|");
  }

  /* -------------------------------------------- */
  /*  Life-Cycle                                  */
  /* -------------------------------------------- */

  connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    const rolls = this.chatMessage.rolls.filter(r => r instanceof DamageRoll);
    this.damages = aggregateDamageRolls(rolls, { respectProperties: true }).map(roll => ({
      properties: new Set(roll.options.properties ?? []),
      type: roll.options.type,
      value: Math.max(0, roll.total)
    }));

    // Build the frame HTML only once
    if ( !this.targetList ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${_loc("DND5E.Apply")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <section class="icon-row multiplier-row">
              <i class="fa-fw fa-solid fa-sliders" aria-label="${_loc("DND5E.DamageApplication.Multiplier")}"></i>
              <div class="damage-multipliers split-button"></div>
            </section>
            <template></template>
            <button class="apply-button" type="button" data-action="applyDamage">
              <i class="fa-light fa-reply-all fa-flip-horizontal" inert></i>
              <span>${_loc("DND5E.Apply")}</span>
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.applyButton = div.querySelector(".apply-button");
      this.applyButton.addEventListener("click", this._onApplyDamage.bind(this));
      const multipliers = div.querySelector(".multiplier-row .damage-multipliers");
      multipliers.append(...this.buildMultiplierButtons(this.multiplier));
      multipliers.addEventListener("click", this._onChangeMultiplier.bind(this));
      div.querySelector("template").replaceWith(this.buildTargetContainer());
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Build a row of multiplier buttons.
   * @param {Set<number>|number} active  The currently active button.
   * @returns {HTMLButtonElement[]}
   */
  buildMultiplierButtons(active) {
    const pressed = active instanceof Set ? active : new Set([active]);
    return MULTIPLIERS.map(([value, display]) => {
      const button = document.createElement("button");
      button.classList.add("multiplier-button", "split-control");
      Object.assign(button, { value, ariaPressed: pressed.has(value), type: "button" });
      button.insertAdjacentHTML("afterbegin", `<span>${display}</span>`);
      return button;
    });
  }

  /* -------------------------------------------- */

  /**
   * Build the container for the target pills.
   * @returns {RecordedTargetsElement}
   */
  buildTargetContainer() {
    this.targetList = document.createElement("recorded-targets");
    this.targetList.onBuildTargetListEntry = this.buildTargetListEntry.bind(this);
    this.targetList.suspended = !this.open;
    this.targetList.addEventListener("click", this.#onPaneInteract.bind(this));
    this.targetList.addEventListener("toggle", this.#onToggleMenu.bind(this), { capture: true });
    this.targetList.addEventListener("change", this.#onToggleGroup.bind(this));
    return this.targetList;
  }

  /* -------------------------------------------- */

  /**
   * Handle building & grouping target entries.
   * @type {RecordedTargetEntryCallback}
   */
  buildTargetListEntry(targetList, { uuid, name }) {
    const token = fromUuidSync(uuid);
    if ( !token?.isOwner ) return;

    const options = this.getMergedOptions(uuid);
    const damage = this.calculateDamage(token.actor, options);
    const key = this.#getGroupingKey(token, options, damage);
    let group = targetList.targetGroups[key];
    const isGrouped = group;

    if ( !group ) {
      group = document.createElement("li");
      const pill = document.createElement("target-pill");
      pill.insertAdjacentHTML("afterbegin", `
        <label></label>
        <datalist></datalist>
        <span class="calculated damage">
          <span class="value"></span>
        </span>
        <span class="calculated temp">
          <span class="value"></span>
          <dnd5e-icon src="systems/dnd5e/icons/svg/damage/temphp.svg" inert></dnd5e-icon>
        </span>
        <span class="calculated temp-max">
          <span class="value"></span>
          <dnd5e-icon src="systems/dnd5e/icons/svg/damage/maxhp.svg" inert></dnd5e-icon>
        </span>
      `);
      pill.toggle = true;
      pill.toggleAttribute("menu", true);
      pill.onBuildPane = this.#buildTargetPane.bind(this);
      pill.onBuildMenuEntry = this.#buildTargetMenuEntry.bind(this);
      pill.onEntryClick = this.#onClickTargetMenuEntry.bind(this);
      group.append(pill);
      targetList.targetGroups[key] = group;
      this.refreshListEntry(group, damage);
    }

    const option = document.createElement("option");
    option.value = uuid;
    option.toggleAttribute("data-checked", options.multiplier !== 0);
    option.append(name);
    const data = group.querySelector("datalist");
    data.append(option);
    const count = data.children.length;
    group.querySelector("label").textContent = count > 1
      ? _loc("DND5E.CHATMESSAGE.Targets.Count", { name, number: count })
      : name;

    return isGrouped ? null : group;
  }

  /* -------------------------------------------- */

  /**
   * Get the label and pressed value for a specific change source.
   * @param {string} type                       Damage type represented by this source.
   * @param {string} change                     Change type (e.g. resistance, immunity, etc.).
   * @param {DamageApplicationOptions} options  Options object from which to determine final values.
   * @returns {{label: string, mode: "active"|"ignore"|"downgrade", pressed: string, title: string}}
   */
  getChangeSourceOptions(type, change, options) {
    let mode = "active";
    if ( (options.ignore?.[change] === true) || options.ignore?.[change]?.has?.(type) ) mode = "ignore";
    else if ( (change === "immunity") && options.downgrade?.has(type) ) mode = "downgrade";

    const title = _loc(`DND5E.DamageApplication.Change.${change.capitalize()}`, {
      type: type === "ALL"
        ? _loc("DND5E.DAMAGE.All")
        : CONFIG.DND5E.damageTypes[type]?.label ?? CONFIG.DND5E.healingTypes[type]?.label
    });
    let label = title;
    if ( mode === "ignore" ) label = _loc("DND5E.DamageApplication.Ignoring", { source: title });
    if ( mode === "downgrade" ) label = _loc("DND5E.DamageApplication.Downgrading", { source: title });

    return { label, mode, title, pressed: mode === "active" ? "false" : mode === "ignore" ? "true" : "mixed" };
  }

  /* -------------------------------------------- */

  /**
   * Refresh the damage total on a list entry based on modified options.
   * @param {HTMLLIElement} entry  The list entry.
   * @param {DamageCalc} damage    The damage calculation.
   */
  refreshListEntry(entry, { temp, tempMax, total }) {
    const [d, t, m] = entry.querySelectorAll(".calculated:is(.damage, .temp, .temp-max) > .value");
    d.textContent = formatNumber(-total, { signDisplay: "exceptZero" });
    d.parentElement.classList.toggle("healing", total < 0);
    d.parentElement.dataset.tooltip = `DND5E.${total < 0 ? "Healing" : "Damage"}`;
    d.parentElement.hidden = !total && (!!temp || !!tempMax);
    t.textContent = formatNumber(temp);
    t.parentElement.hidden = !temp;
    m.textContent = formatNumber(-tempMax, { signDisplay: "always" });
    m.parentElement.classList.toggle("healing", tempMax < 0);
    m.parentElement.hidden = !tempMax;
  }

  /* -------------------------------------------- */

  /**
   * Build the display of options that affect the target's damage calculation.
   * @param {Record<string, Set<string>|boolean>} active  Active multiplier sources.
   * @param {DamageApplicationOptions} options            Options object from which to determine final values.
   * @returns {HTMLLIElement[]}
   */
  #buildChangeSources(active, options) {
    const entries = [];
    for ( const [change, values] of Object.entries(active) ) {
      const types = change === "threshold" ? (values ? ["threshold"] : []) : Array.from(values ?? []);
      for ( const type of types ) {
        const icon = type === "ALL"
          ? "systems/dnd5e/icons/svg/damage/all.svg"
          : change === "threshold"
            ? "systems/dnd5e/icons/svg/damage/threshold.svg"
            : (CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type])?.icon;
        if ( !icon ) continue;
        const { label, mode, pressed, title } = this.getChangeSourceOptions(type, change, options);
        const li = document.createElement("li");
        li.classList.add("menu-change-source");
        li.insertAdjacentHTML("afterbegin", `
          <button type="button" class="change-source unbutton" data-type="${type}" data-change="${change}"
                  aria-pressed="${pressed}" aria-label="${label}">
            <span class="icon">
              <dnd5e-icon src="${icon}" inert></dnd5e-icon>
              <i class="fa-solid fa-slash" inert></i>
              <i class="fa-solid fa-arrow-turn-down" inert></i>
            </span>
            <span class="title">${title}</span>
            <span class="menu-section">${_loc(`DND5E.DamageApplication.State.${mode}`)}</span>
          </button>
        `);
        entries.push(li);
      }
    }
    return entries;
  }

  /* -------------------------------------------- */

  /**
   * Build the target menu panel when right-clicking a target pill.
   * @param {TargetPillElement} pill  The target pill.
   * @param {HTMLElement} pane        The target pane.
   */
  #buildTargetPane(pill, pane) {
    pane.classList.add("damage-pane");
    const open = this.#paneState.group === pill;
    const uuids = open && this.#paneState.targets.length ? this.#paneState.targets : pill.targets;
    const [uuid] = uuids;
    const token = fromUuidSync(uuid);
    let { calc, options } = open ? this.#paneState : {};
    if ( !calc ) {
      options = this.getMergedOptions(uuid);
      calc = this.calculateDamage(token.actor, options);
      if ( open ) Object.assign(this.#paneState, { calc, options });
    }
    const { active, total } = calc;
    const label = key => {
      const div = document.createElement("div");
      div.classList.add("menu-section");
      div.append(_loc(`DND5E.DamageApplication.Section.${key}`));
      return div;
    };
    const header = document.createElement("header");
    header.classList.add("menu-header");
    header.insertAdjacentHTML("afterbegin", `
      <button type="button" class="back unbutton" ${this.#paneStack.length ? "" : "hidden"} data-action="back"
              aria-label="${_loc("DND5E.DamageApplication.Back")}">
        <i class="fa-solid fa-chevron-left" inert></i>
      </button>
      <span class="title"></span>
      <span class="calculated damage">${formatNumber(-total, { signDisplay: "exceptZero" })}</span>
    `);
    header.querySelector(".title").append(uuids.length > 1
      ? _loc("DND5E.CHATMESSAGE.Targets.Count", { name: token.name, number: uuids.length })
      : token.name);
    const multipliers = document.createElement("div");
    multipliers.classList.add("menu-multipliers", "damage-multipliers", "split-button");
    multipliers.append(...this.buildMultiplierButtons(new Set(uuids.map(u => this.getMergedOptions(u).multiplier))));
    const sources = document.createElement("menu");
    sources.classList.add("menu-change-sources", "unlist");
    sources.append(...this.#buildChangeSources(active, options));
    const sections = [header, label("Multiplier"), multipliers];
    if ( sources.children.length ) sections.push(label("Changes"), sources);
    if ( uuids.length > 1 ) sections.push(label("Targets"));
    pane.prepend(...sections);
  }

  /* -------------------------------------------- */

  /**
   * Build an entry in the target menu.
   * @type {TargetPillMenuEntryCallback}
   */
  #buildTargetMenuEntry(pill, { name, uuid }) {
    const { targets } = this.#paneState;
    if ( (targets.length ? targets : pill.targets).length === 1 ) return;
    const token = fromUuidSync(uuid);
    const { total } = this.calculateDamage(token.actor, this.getMergedOptions(uuid));
    const li = document.createElement("li");
    li.dataset.uuid = uuid;
    li.insertAdjacentHTML("afterbegin", `
      <button type="button" class="pan-target unbutton"><i class="fa-solid fa-arrows-to-circle" inert></i></button>
      <span class="title"></span>
      <span class="calculated damage">${formatNumber(-total, { signDisplay: "exceptZero" })}</span>
      <i class="fa-solid fa-chevron-right" inert></i>
    `);
    li.querySelector(".pan-target").ariaLabel = _loc("DND5E.EFFECT.Action.PanToToken");
    li.querySelector(".title").append(name);
    return li;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _handleToggleOpen(open) {
    super._handleToggleOpen(open);
    if ( this.targetList ) this.targetList.suspended = !open;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the apply damage button.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onApplyDamage(event) {
    event.preventDefault();
    for ( const target of this.targetList.querySelectorAll("option") ) {
      const token = fromUuidSync(target.value);
      const options = this.getMergedOptions(target.value);
      await token?.actor?.applyDamage(this.damages, { ...options, isDelta: true, origin: this.chatMessage });
    }
    if ( game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual" ) {
      this.open = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the global damage multiplier.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onChangeMultiplier(event) {
    const button = event.target.closest(".multiplier-button");
    if ( !button ) return;
    this.multiplier = Number(button.value);
    for ( const other of this.querySelectorAll(".multiplier-row .multiplier-button") ) {
      other.ariaPressed = `${Number(other.value) === this.multiplier}`;
    }
    this.targetList.buildTargetsList();
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a target in the menu.
   * @param {TargetPillElement} pill  The parent target-pill.
   * @param {PointerEvent} event      The triggering event.
   */
  #onClickTargetMenuEntry(pill, event) {
    const { uuid } = event.target.closest("[data-uuid]")?.dataset ?? {};
    if ( !uuid ) return;
    event.preventDefault();
    this.#paneStack.push({ ...this.#paneState });
    this.#paneState = { group: pill, targets: [uuid] };
    pill.buildPane();
  }

  /* -------------------------------------------- */

  /**
   * Handle interactions within the target pane.
   * @param {PointerEvent} event  Triggering click event.
   */
  #onPaneInteract(event) {
    if ( event.target.closest("target-pill") ) event.stopPropagation();
    const button = event.target.closest(".multiplier-button, .change-source, .back");
    if ( !button ) return;
    if ( button.classList.contains("back") ) this.#paneState = this.#paneStack.pop() ?? { targets: [] };
    else {
      for ( const uuid of this.#paneState.targets ) {
        const options = this.getTargetOptions(uuid);
        if ( button.classList.contains("multiplier-button") ) options.multiplier = Number(button.value);
        else this.#cycleChangeSource(options, button.dataset);
      }
    }
    Object.assign(this.#paneState, { calc: null, options: null });
    const { group, targets } = this.#paneState;
    const [uuid] = targets;
    const token = fromUuidSync(uuid);
    this.refreshListEntry(group.parentElement, this.calculateDamage(token.actor, this.getMergedOptions(uuid)));
    group.buildPane();
  }

  /* -------------------------------------------- */

  /**
   * Handle including or excluding the entire group from damage application.
   * @param {PointerEvent} event  The triggering event.
   */
  #onToggleGroup(event) {
    const pill = event.target.closest("target-pill");
    if ( !pill ) return;
    for ( const option of pill.querySelectorAll("option") ) {
      const options = this.getTargetOptions(option.value);
      if ( !("checked" in option.dataset) ) options.multiplier = 0;
      else if ( this.multiplier === 0 ) options.multiplier = 1;
      else delete options.multiplier;
    }
    this.targetList.buildTargetsList();
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling the target menu.
   * @param {ToggleEvent} event  The triggering event.
   */
  #onToggleMenu(event) {
    const pill = event.target.closest("target-pill");
    if ( event.newState === "open" ) {
      clearTimeout(this.#rebuild);
      Object.assign(this.#paneState, { group: pill, targets: pill.targets });
      this.#paneStack = [];
      return;
    }
    this.#paneState = { targets: [] };
    this.#paneStack = [];
    // Because we have to defer #onToggleOpen via setTimeout we create an ordering issue where a right-click on a
    // different target pill dismisses the target pane, triggering a rebuild of the tray. The event's original target
    // then disappears out from underneath the cursor. We have to defer the rebuild also to fix the ordering of events.
    this.#rebuild = setTimeout(() => {
      if ( this.querySelector(".target-pane:popover-open") ) return;
      this.targetList.buildTargetsList();
    });
  }
}
