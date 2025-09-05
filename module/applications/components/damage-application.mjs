import { formatNumber } from "../../utils.mjs";
import ChatTrayElement from "./chat-tray-element.mjs";
import TargetedApplicationMixin from "./targeted-application-mixin.mjs";

/**
 * List of multiplier options as tuples containing their numeric value and rendered text.
 * @type {[number, string][]}
 */
const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

/**
 * Application to handle applying damage from a chat card.
 */
export default class DamageApplicationElement extends TargetedApplicationMixin(ChatTrayElement) {

  /* -------------------------------------------- */
  /*  Properties                                  */
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

  /** @override */
  get shouldBuildTargetList() {
    return super.shouldBuildTargetList && this.open && this.visible;
  }

  /* -------------------------------------------- */

  /**
   * Options for each application target.
   * @type {Map<string, DamageApplicationOptions>}
   */
  #targetOptions = new Map();

  /**
   * Options for a specific target.
   * @param {string} uuid  UUID of the targeted token.
   * @returns {DamageApplicationOptions}
   */
  getTargetOptions(uuid) {
    if ( !this.#targetOptions.has(uuid) ) this.#targetOptions.set(uuid, { multiplier: 1 });
    return this.#targetOptions.get(uuid);
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
    if ( !this.targetList ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible");
      if ( !this.open ) div.classList.add("collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${game.i18n.localize("DND5E.Apply")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <button class="apply-damage" type="button" data-action="applyDamage">
              <i class="fa-solid fa-reply-all fa-flip-horizontal" inert></i>
              ${game.i18n.localize("DND5E.Apply")}
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      this.applyButton = div.querySelector(".apply-damage");
      this.applyButton.addEventListener("click", this._onApplyDamage.bind(this));
      div.querySelector(".wrapper").prepend(...this.buildTargetContainer());
      div.addEventListener("click", this._handleClickHeader.bind(this));
    }

    this.targetingMode = this.targetSourceControl.hidden ? "selected" : "targeted";
  }

  /* -------------------------------------------- */

  /** @override */
  buildTargetListEntry({ uuid, name }) {
    const actor = fromUuidSync(uuid);
    if ( !actor?.isOwner ) return;

    // Calculate damage to apply
    const targetOptions = this.getTargetOptions(uuid);
    const { temp, total, active } = this.calculateDamage(actor, targetOptions);

    const types = [];
    for ( const [change, values] of Object.entries(active) ) {
      for ( const type of values ) {
        const config = CONFIG.DND5E.damageTypes[type] ?? CONFIG.DND5E.healingTypes[type];
        if ( !config ) continue;
        const data = { type, change, icon: config.icon };
        types.push(data);
      }
    }
    const changeSources = types.reduce((acc, {type, change, icon}) => {
      const { label, pressed } = this.getChangeSourceOptions(type, change, targetOptions);
      acc += `
        <button class="change-source unbutton" type="button" data-type="${type}" data-change="${change}"
                data-tooltip aria-label="${label}" aria-pressed="${pressed}">
          <dnd5e-icon src="${icon}" inert></dnd5e-icon>
          <i class="fa-solid fa-slash" inert></i>
          <i class="fa-solid fa-arrow-turn-down" inert></i>
        </button>
      `;
      return acc;
    }, "");

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon">
      <div class="name-stacked">
        <span class="title"></span>
        ${changeSources ? `<span class="subtitle">${changeSources}</span>` : ""}
      </div>
      <div class="calculated damage">
        ${total}
      </div>
      <div class="calculated temp" data-tooltip="DND5E.HitPointsTemp">
        ${temp}
      </div>
      <menu class="damage-multipliers unlist"></menu>
    `;
    Object.assign(li.querySelector(".gold-icon"), { alt: name, src: actor.img });
    li.querySelector(".name-stacked .title").append(name);
    const menu = li.querySelector("menu");
    for ( const [value, display] of MULTIPLIERS ) {
      const entry = document.createElement("li");
      entry.innerHTML = `
        <button class="multiplier-button" type="button" value="${value}">
          <span>${display}</span>
        </button>
      `;
      menu.append(entry);
    }

    this.refreshListEntry(actor, li, targetOptions);
    li.addEventListener("click", this._onChangeOptions.bind(this));

    return li;
  }

  /* -------------------------------------------- */

  /**
   * Calculate the total damage that will be applied to an actor.
   * @param {Actor5e} actor
   * @param {DamageApplicationOptions} options
   * @returns {{temp: number, total: number, active: Record<string, Set<string>>}}
   */
  calculateDamage(actor, options) {
    const damages = actor.calculateDamage(this.damages, options);

    let temp = 0;
    let total = 0;
    let active = { modification: new Set(), resistance: new Set(), vulnerability: new Set(), immunity: new Set() };
    for ( const damage of damages ) {
      if ( damage.type === "temphp" ) temp += damage.value;
      else total += damage.value;
      if ( damage.active.modification ) active.modification.add(damage.type);
      if ( damage.active.resistance ) active.resistance.add(damage.type);
      if ( damage.active.vulnerability ) active.vulnerability.add(damage.type);
      if ( damage.active.immunity ) active.immunity.add(damage.type);
    }
    temp = Math.floor(Math.max(0, temp));
    total = total > 0 ? Math.floor(total) : Math.ceil(total);

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
    }

    return { temp, total, active };
  }

  /* -------------------------------------------- */

  /**
   * Get the label and pressed value for a specific change source.
   * @param {string} type                       Damage type represented by this source.
   * @param {string} change                     Change type (e.g. resistance, immunity, etc.).
   * @param {DamageApplicationOptions} options  Options object from which to determine final values.
   * @returns {{label: string, pressed: string}}
   */
  getChangeSourceOptions(type, change, options) {
    let mode = "active";
    if ( options.ignore?.[change]?.has(type) ) mode = "ignore";
    else if ( (change === "immunity") && options.downgrade?.has(type) ) mode = "downgrade";

    let label = game.i18n.format(`DND5E.DamageApplication.Change.${change.capitalize()}`, {
      type: CONFIG.DND5E.damageTypes[type]?.label ?? CONFIG.DND5E.healingTypes[type]?.label
    });
    if ( mode === "ignore" ) label = game.i18n.format("DND5E.DamageApplication.Ignoring", { source: label });
    if ( mode === "downgrade" ) label = game.i18n.format("DND5E.DamageApplication.Downgrading", { source: label });

    return { label, pressed: mode === "active" ? "false" : mode === "ignore" ? "true" : "mixed" };
  }

  /* -------------------------------------------- */

  /**
   * Refresh the damage total on a list entry based on modified options.
   * @param {Actor5e} token
   * @param {HTMLLiElement} entry
   * @param {DamageApplicationOptions} options
   */
  refreshListEntry(token, entry, options) {
    const { temp, total } = this.calculateDamage(token, options);
    const calculatedDamage = entry.querySelector(".calculated.damage");
    calculatedDamage.innerText = formatNumber(-total, { signDisplay: "exceptZero" });
    calculatedDamage.classList.toggle("healing", total < 0);
    calculatedDamage.dataset.tooltip = `DND5E.${total < 0 ? "Healing" : "Damage"}`;
    calculatedDamage.hidden = !total && !!temp;
    const calculatedTemp = entry.querySelector(".calculated.temp");
    calculatedTemp.innerText = temp;
    calculatedTemp.hidden = !temp;

    const pressedMultiplier = entry.querySelector('.multiplier-button[aria-pressed="true"]');
    if ( Number(pressedMultiplier?.dataset.multiplier) !== options.multiplier ) {
      if ( pressedMultiplier ) pressedMultiplier.ariaPressed = false;
      const toPress = entry.querySelector(`[value="${options.multiplier}"]`);
      if ( toPress ) toPress.ariaPressed = true;
    }

    for ( const element of entry.querySelectorAll(".change-source") ) {
      const { type, change } = element.dataset;
      const { label, pressed } = this.getChangeSourceOptions(type, change, options);
      element.dataset.tooltip = label;
      element.ariaLabel = label;
      element.ariaPressed = pressed;
    }
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle clicking the apply damage button.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onApplyDamage(event) {
    event.preventDefault();
    for ( const target of this.targetList.querySelectorAll("[data-target-uuid]") ) {
      const token = fromUuidSync(target.dataset.targetUuid);
      const options = this.getTargetOptions(target.dataset.targetUuid);
      await token?.applyDamage(this.damages, { ...options, isDelta: true });
    }
    if ( game.settings.get("dnd5e", "autoCollapseChatTrays") !== "manual" ) {
      this.open = false;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a multiplier button or resistance toggle.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onChangeOptions(event) {
    event.preventDefault();
    const button = event.target.closest("button");
    const uuid = event.target.closest("[data-target-uuid]")?.dataset.targetUuid;
    if ( !uuid || !button ) return;

    const options = this.getTargetOptions(uuid);

    // Set multiplier
    if ( button.classList.contains("multiplier-button") ) {
      options.multiplier = Number(button.value);
    }

    // Set imm/res/vul ignore & downgrade
    else if ( button.classList.contains("change-source") ) {
      const { type, change } = button.dataset;
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
      else if ( options.ignore?.[change]?.has(type) ) options.ignore[change].delete(type);
      else {
        options.ignore ??= {};
        options.ignore[change] ??= new Set();
        options.ignore[change].add(type);
      }
    }

    const token = fromUuidSync(uuid);
    const entry = this.targetList.querySelector(`[data-target-uuid="${token.uuid}"]`);
    this.refreshListEntry(token, entry, options);
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
