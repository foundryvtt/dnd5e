/**
 * List of multiplier options as tuples containing their numeric value and rendered text.
 * @type {[number, string][]}
 */
const MULTIPLIERS = [[-1, "-1"], [0, "0"], [.25, "¼"], [.5, "½"], [1, "1"], [2, "2"]];

/**
 * Application to handle applying damage from a chat card.
 */
export default class DamageApplicationElement extends HTMLElement {

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

  /**
   * The list of application targets.
   * @type {HTMLUListElement}
   */
  targetList;

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
  targetOptions(uuid) {
    if ( !this.#targetOptions.has(uuid) ) this.#targetOptions.set(uuid, { multiplier: 1 });
    return this.#targetOptions.get(uuid);
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  async connectedCallback() {
    // Fetch the associated chat message
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.targetList ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "damage-tray", "collapsible");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-heart-crack"></i>
          <span>${game.i18n.localize("DND5E.Apply")}</span>
          <i class="fa-solid fa-caret-down"></i>
        </label>
        <div class="collapsible-content">
          <!-- TODO: For GM users, add switch between Targeted & Selected tokens -->
          <ul class="targets unlist"></ul>
          <button class="apply-damage" type="button" data-action="applyDamage">
            <i class="fa-solid fa-reply-all fa-flip-horizontal"></i>
            ${game.i18n.localize("DND5E.Apply")}
          </button>
        </div>
      `;
      this.replaceChildren(div);
      this.applyButton = div.querySelector(".apply-damage");
      this.applyButton.addEventListener("click", this._onApplyDamage.bind(this));
      this.targetList = div.querySelector(".targets");
      div.querySelector(".collapsible-content").addEventListener("click", event => {
        event.stopImmediatePropagation();
      });
    }

    // TODO: Fetch list of targeted tokens
    const targetedTokens = ["Scene.N0f8tURZUeuPKHH2.Token.tZwBXZDPpYHSwnEv.Actor.KO931H2sXBlaABzx"];
    for ( const uuid of targetedTokens ) {
      const entry = await this.buildTargetListEntry(uuid);
      if ( entry ) this.targetList.append(entry);
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a list entry for a single target.
   * @param {string} uuid  UUID of the token represented by this entry.
   * @returns {HTMLLIElement|void}
   */
  async buildTargetListEntry(uuid) {
    const token = await fromUuid(uuid);
    if ( !token ) return;

    // Calculate damage to apply
    const targetOptions = this.targetOptions(uuid);
    const { total } = this.calculateDamage(token, targetOptions);

    const li = document.createElement("li");
    li.classList.add("target");
    li.dataset.targetUuid = uuid;
    li.innerHTML = `
      <img class="gold-icon" alt="${token.name}" src="${token.img}">
      <div class="name-stacked">
        <span class="title">${token.name}</span>
        <!-- TODO: List resistances, etc. applied -->
      </div>
      <div class="calculated-damage">
        ${total}
      </div>
      <menu class="damage-multipliers unlist"></menu>
    `;

    const menu = li.querySelector("menu");
    for ( const [value, display] of MULTIPLIERS ) {
      const entry = document.createElement("li");
      entry.innerHTML = `
        <label>
          <span>${display}</span>
          <input type="radio" name="multiplier/${this.chatMessage.id}/${uuid}" value="${value}"
                 ${value === targetOptions.multiplier ? " checked" : ""}>
        </label>
      `;
      menu.append(entry);
    }

    li.addEventListener("change", this._onChangeOptions.bind(this));

    return li;
  }

  /* -------------------------------------------- */

  /**
   * Calculate the total damage that will be applied to an actor.
   * @param {Actor5e} actor
   * @param {DamageApplicationOptions} options
   * @returns {{total: number, damages: DamageDescription[]}}
   */
  calculateDamage(actor, options) {
    const damages = actor.calculateDamage(this.damages, options);

    let total = damages.reduce((acc, d) => acc + d.value, 0);
    total = total > 0 ? Math.floor(total) : Math.ceil(total);

    return { total, damages };
  }

  /* -------------------------------------------- */

  /**
   * Refresh the damage total on a list entry based on modified options.
   * @param {string} uuid
   * @param {DamageApplicationOptions} options
   */
  async refreshListEntry(uuid, options) {
    const entry = this.targetList.querySelector(`[data-target-uuid="${uuid}"]`);
    const token = await fromUuid(uuid);
    if ( !token || !entry ) return;

    const { total } = this.calculateDamage(token, options);
    entry.querySelector(".calculated-damage").innerText = total;
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
      const token = await fromUuid(target.dataset.targetUuid);
      const options = this.targetOptions(target.dataset.targetUuid);
      await token?.applyDamage(this.damages, options);
    }
    this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking a multiplier button or resistance toggle.
   * @param {PointerEvent} event  Triggering click event.
   */
  _onChangeOptions(event) {
    event.preventDefault();
    const uuid = event.target.closest("[data-target-uuid]")?.dataset.targetUuid;
    if ( !uuid ) return;

    const options = this.targetOptions(uuid);

    // Set multiplier
    if ( event.target.name.startsWith("multiplier") ) {
      options.multiplier = Number(event.target.value);
    }

    // TODO: Set imm/res/vul ignore & downgrade

    this.refreshListEntry(uuid, options);
  }
}
