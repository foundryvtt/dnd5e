/**
 * Application to handle applying enchantments to items from a chat card.
 */
export default class EnchantmentApplicationElement extends HTMLElement {

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The chat message with which this enchantment is associated.
   * @type {ChatMessage5e}
   */
  chatMessage;

  /* -------------------------------------------- */

  /**
   * Area where items can be dropped to enchant.
   * @type {HTMLElement}
   */
  dropArea;

  /* -------------------------------------------- */

  /**
   * Dropped item to be enchanted.
   * @type {Item5e}
   */
  #droppedItem;

  get droppedItem() {
    return this.#droppedItem;
  }

  set droppedItem(item) {
    this.#droppedItem = item;
    if ( this.#droppedItem ) {
      this.dropArea.innerHTML = `
        <div class="preview">
          <img src="${item.img}" class="gold-icon" alt="${item.name}">
          <span class="name">${item.name}</span>
        </div>
      `;
    }
    else this.dropArea.innerHTML = `<p>${game.i18n.localize("DND5E.Enchantment.DropArea")}</p>`;
  }

  /* -------------------------------------------- */

  /**
   * Item providing the enchantment that will be applied.
   * @type {Item5e}
   */
  get enchantmentItem() {
    return this.chatMessage.getAssociatedItem();
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  connectedCallback() {
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if ( !this.chatMessage ) return;

    // Build the frame HTML only once
    if ( !this.dropArea ) {
      const div = document.createElement("div");
      div.classList.add("card-tray", "enchantment-tray", "collapsible", "collapsed");
      div.innerHTML = `
        <label class="roboto-upper">
          <i class="fa-solid fa-wand-sparkles" inert></i>
          <span>${game.i18n.localize("DND5E.ActionEnch")}</span>
          <i class="fa-solid fa-caret-down" inert></i>
        </label>
        <div class="collapsible-content">
          <div class="wrapper">
            <div class="drop-area"></div>
            <button class="apply-enchantment" type="button" data-action="applyEnchantment">
              <i class="fa-solid fa-reply-all fa-flip-horizontal" inert></i>
              ${game.i18n.localize("DND5E.Apply")}
            </button>
          </div>
        </div>
      `;
      this.replaceChildren(div);
      div.querySelector(".apply-enchantment").addEventListener("click", this._onApplyEnchantment.bind(this));
      this.dropArea = div.querySelector(".drop-area");
      div.querySelector(".collapsible-content").addEventListener("click", event => {
        event.stopImmediatePropagation();
      });
      this.addEventListener("drop", this._onDrop.bind(this));
    }

    this.droppedItem = null;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle clicking the apply enchantment button.
   * @param {PointerEvent} event  Triggering click event.
   */
  async _onApplyEnchantment(event) {
    event.preventDefault();

    const effect = this.enchantmentItem.effects.get(this.chatMessage.getFlag("dnd5e", "use.enchantmentProfile"));
    if ( !effect ) return;

    const concentrationId = this.chatMessage.getFlag("dnd5e", "use.concentrationId");
    const concentration = effect.parent.actor.effects.get(concentrationId);
    if ( concentrationId && !concentration ) {
      ui.notifications.error("DND5E.Enchantment.Warning.ConcentrationEnded", { localize: true });
      return;
    }
    if ( !game.user.isGM && concentration && !concentration.actor?.isOwner ) {
      ui.notifications.error("DND5E.EffectApplyWarningConcentration", { localize: true });
      return;
    }

    const effectData = effect.toObject();
    effectData.origin = this.enchantmentItem.uuid;
    const applied = await ActiveEffect.create(effectData, { parent: this.droppedItem, keepOrigin: true });
    if ( concentration ) await concentration.addDependent(applied);

    this.droppedItem = null;
    this.querySelector(".collapsible").dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true }));
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping an item onto the control.
   * @param {Event} event  Triggering drop event.
   */
  async _onDrop(event) {
    event.preventDefault();
    const data = TextEditor.getDragEventData(event);
    if ( data.type !== "Item" ) return;
    const droppedItem = await Item.implementation.fromDropData(data);

    // Validate against the enchantment's restraints on the origin item
    const errors = this.enchantmentItem.system.enchantment?.canEnchant(droppedItem);
    if ( errors?.length ) {
      errors.forEach(err => ui.notifications.error(err.message));
      return;
    }

    this.droppedItem = droppedItem;
  }
}
