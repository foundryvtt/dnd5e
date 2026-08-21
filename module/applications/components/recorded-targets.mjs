import TargetsField from "../../data/chat-message/fields/targets-field.mjs";

/**
 * @import { RecordedTargetEntryCallback, TargetPillMenuEntryCallback } from "./_types.mjs";
 */

/**
 * An element that represents a chat message's recorded targets.
 */
export default class RecordedTargetsElement extends foundry.applications.elements.AdoptableHTMLElement {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The HTML tag name used by this element.
   * @type {string}
   */
  static tagName = "recorded-targets";

  /* -------------------------------------------- */

  /**
   * The parent chat message.
   * @type {ChatMessage5e}
   */
  chatMessage;

  /* -------------------------------------------- */

  /**
   * Whether the associated chat message recorded any targets.
   * @type {boolean}
   */
  get hasRecordedTargets() {
    return !!this.chatMessage?.system?.targets?.length;
  }

  /* -------------------------------------------- */

  /**
   * A callback to invoke when building a target list entry.
   * @type {RecordedTargetEntryCallback}
   */
  onBuildTargetListEntry;

  /* -------------------------------------------- */

  /**
   * Currently registered hook for monitoring for changes to selected tokens.
   * @type {number|null}
   */
  selectedTokensHook = null;

  /* -------------------------------------------- */

  /**
   * Whether to rebuild the target list.
   * @type {boolean}
   */
  get shouldBuildTargetList() {
    return !!this.targetList && this.visible && !this.suspended;
  }

  /* -------------------------------------------- */

  /**
   * Whether the element is inside a collapsed tray and its functionality has been suspended.
   * @type {boolean}
   */
  get suspended() {
    return this.hasAttribute("suspended");
  }

  set suspended(suspended) {
    this.toggleAttribute("suspended", suspended);
    if ( !suspended ) this.buildTargetsList();
  }

  /* -------------------------------------------- */

  /**
   * The list of targeted UUIDs.
   * @type {string[]}
   */
  get targets() {
    return Iterator.from(this.querySelectorAll("target-pill")).flatMap(pill => pill.value);
  }

  /* -------------------------------------------- */

  /**
   * Current target selection mode.
   * @type {"selected"|"targeted"}
   */
  get targetingMode() {
    return this.#targetingMode;
  }

  set targetingMode(mode) {
    if ( !this.hasRecordedTargets ) mode = "selected";
    this.#targetingMode = mode;
    if ( this.chatMessage ) this.chatMessage._targetState.mode = mode;
    this._refreshTargetMode();
    this.buildTargetsList();
    if ( (mode === "targeted") && (this.selectedTokensHook !== null) ) {
      Hooks.off("controlToken", this.selectedTokensHook);
      this.selectedTokensHook = null;
    } else if ( (mode === "selected") && this.selectedTokensHook === null ) {
      this.selectedTokensHook = Hooks.on("controlToken", foundry.utils.debounce(() => this.buildTargetsList(), 50));
    }
  }

  #targetingMode = "targeted";

  /* -------------------------------------------- */

  /**
   * Target pills grouped by their grouping keys.
   * @type {Record<string, HTMLLIElement>}
   */
  targetGroups;

  /* -------------------------------------------- */

  /**
   * The list of application targets.
   * @type {HTMLUListElement}
   */
  targetList;

  /* -------------------------------------------- */

  /**
   * The controls for selecting target source mode.
   * @type {HTMLElement}
   */
  targetSourceControl;

  /* -------------------------------------------- */

  /**
   * Whether the element is on-screen.
   * @type {boolean}
   */
  get visible() {
    return this.hasAttribute("visible") || this.matches("#chat-notifications :scope");
  }

  set visible(visible) {
    this.toggleAttribute("visible", visible);
    if ( visible ) this.buildTargetsList();
  }

  /* -------------------------------------------- */

  /**
   * The AbortController instance used to manage event listener lifecycle.
   * @type {AbortController}
   */
  #abortController;

  /* -------------------------------------------- */

  /**
   * Checked status for application targets.
   * @type {Map<string, boolean>}
   */
  #targetOptions = new Map();

  /* -------------------------------------------- */
  /*  Life-Cycle                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  connectedCallback() {
    super.connectedCallback?.();
    this.#abortController = new AbortController();
    this.chatMessage = game.messages.get(this.closest("[data-message-id]")?.dataset.messageId);
    if ( !this.targetList ) this.replaceChildren(this.buildTargetContainer());
    this.addEventListener("change", this._onCheckTarget.bind(this), { signal: this.#abortController.signal });
    this.#targetOptions = this.chatMessage?._targetState.checked ?? new Map();
    this.targetingMode = this.chatMessage?._targetState.mode || "targeted";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  disconnectedCallback() {
    super.disconnectedCallback?.();
    this.#abortController?.abort();
    if ( this.selectedTokensHook ) Hooks.off("controlToken", this.selectedTokensHook);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Determine whether the given target is checked.
   * @param {string} uuid  UUID of the target.
   * @returns {boolean}
   */
  targetChecked(uuid) {
    if ( this.targetingMode === "selected" ) return true;
    return this.#targetOptions.get(uuid) ?? true;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Build the target list row.
   * @returns {HTMLUListElement}
   */
  buildTargetContainer() {
    this.targetSourceControl = this._buildTargetSourceControl();
    this.targetList = document.createElement("ul");
    this.targetList.classList.add("targets", "unlist", "pills");
    const row = document.createElement("section");
    row.classList.add("icon-row");
    row.append(this.targetSourceControl, this.targetList);
    return row;
  }

  /* -------------------------------------------- */

  /**
   * Build a list of targeted tokens based on the current mode & replace any existing targets.
   */
  buildTargetsList() {
    if ( this.shouldBuildTargetList === false ) return;
    this.targetGroups = {};
    const targetedTokens = new Map();
    switch ( this.targetingMode ) {
      case "targeted":
        for ( const descriptor of this.chatMessage?.system?.targets ?? [] ) {
          const { actor, token } = TargetsField.resolve(descriptor);
          if ( actor || token ) {
            targetedTokens.set(token?.document.uuid ?? actor?.uuid, token?.name ?? descriptor.name);
          }
        }
        break;
      case "selected":
        canvas.tokens?.controlled?.forEach(t => {
          if ( t.actor ) targetedTokens.set(t.document.uuid, t.name);
        });
        break;
    }
    const targets = Array.from(targetedTokens.entries())
      .map(([uuid, name]) => {
        return this.onBuildTargetListEntry
          ? this.onBuildTargetListEntry(this, { name, uuid })
          : this.buildTargetListEntry({ name, uuid });
      })
      .filter(_ => _);
    if ( targets.length ) this.targetList.replaceChildren(...targets);
    else {
      const li = document.createElement("li");
      li.classList.add("none", "pill", "target", "transparent");
      li.textContent = _loc("DND5E.Tokens.NoTargets");
      this.targetList.replaceChildren(li);
    }
    this.dispatchEvent(new Event("recorded-targets:build"));
  }

  /* -------------------------------------------- */

  /**
   * Handle building & grouping target entries.
   * @param {options} entry
   * @param {string} entry.name  The entry's name.
   * @param {string} entry.uuid  The entry's UUID.
   * @returns {HTMLLIElement|null|void}
   */
  buildTargetListEntry({ name, uuid }) {
    const token = fromUuidSync(uuid);
    if ( !token?.isOwner ) return;

    const key = token.getGroupingKey?.() ?? token.uuid;
    let group = this.targetGroups[key];
    const isGrouped = group;

    if ( !group ) {
      group = document.createElement("li");
      const pill = document.createElement("target-pill");
      pill.insertAdjacentHTML("afterbegin", "<label></label><datalist></datalist>");
      pill.querySelector("label").append(name);
      pill.disabled = this.targetingMode === "selected";
      pill.toggle = true;
      pill.onBuildMenuEntry = this.#buildTargetMenuEntry.bind(this);
      pill.onEntryClick = this.#onClickTargetMenuEntry.bind(this);
      group.append(pill);
      this.targetGroups[key] = group;
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

    return isGrouped ? null : group;
  }

  /* -------------------------------------------- */

  /**
   * Build the control used to switch between target sources.
   * @returns {HTMLElement}
   * @protected
   */
  _buildTargetSourceControl() {
    const control = document.createElement("button");
    control.type = "button";
    control.classList.add("unbutton", "control-button", "target-source-toggle");
    control.toggleAttribute("data-tooltip", true);
    control.addEventListener("click", this._onChangeTargetMode.bind(this));
    return control;
  }

  /* -------------------------------------------- */

  /**
   * Update the target source control to reflect the current targeting mode.
   * @protected
   */
  _refreshTargetMode() {
    const targeted = this.targetingMode === "targeted";
    this.targetSourceControl.dataset.mode = this.targetingMode;
    this.targetSourceControl.ariaLabel = _loc(`DND5E.Tokens.${targeted ? "Targeted" : "Selected"}`);
    this.targetSourceControl.disabled = !this.hasRecordedTargets;
  }

  /* -------------------------------------------- */

  /**
   * Create the markup for an entry in the expanded target drop-down.
   * @type {TargetPillMenuEntryCallback}
   */
  #buildTargetMenuEntry(pill, { checked, name, uuid }={}) {
    const li = document.createElement("li");
    li.classList.toggle("active", checked);
    li.dataset.uuid = uuid;
    li.innerHTML = `
      <button type="button" class="pan-target unbutton"><i class="fa-solid fa-arrows-to-circle" inert></i></button>
      <span class="title"></span>
    `;
    li.querySelector(".pan-target").ariaLabel = _loc("DND5E.EFFECT.Action.PanToToken");
    li.querySelector(".title").append(name);
    return li;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle toggling the targeting mode.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onChangeTargetMode(event) {
    event.preventDefault();
    this.targetingMode = this.targetingMode === "targeted" ? "selected" : "targeted";
  }

  /* -------------------------------------------- */

  /**
   * Handle checking or unchecking a target.
   * @param {Event} event  Triggering change event.
   */
  _onCheckTarget(event) {
    this.#targetOptions = new Map(Iterator.from(event.currentTarget.querySelectorAll(".target option"))
      .map(el => [el.value, "checked" in el.dataset]));
    if ( this.chatMessage ) this.chatMessage._targetState.checked = this.#targetOptions;
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a target menu entry.
   * @param {HTMLElement} pill    The target-pill element.
   * @param {PointerEvent} event  The triggering event.
   */
  #onClickTargetMenuEntry(pill, event) {
    event.target.closest("li[data-uuid]")?.classList.toggle("active");
  }
}
