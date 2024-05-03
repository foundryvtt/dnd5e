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
      div.classList.add("enchantment-control");
      div.innerHTML = '<div class="drop-area"></div>';
      this.replaceChildren(div);
      this.dropArea = div.querySelector(".drop-area");
      this.addEventListener("drop", this._onDrop.bind(this));
      this.addEventListener("click", this._onRemoveEnchantment.bind(this));
    }

    this.buildItemList();
  }

  /* -------------------------------------------- */

  /**
   * Build a list of enchanted items.
   */
  async buildItemList() {
    const enchantedItems = (await Promise.all(
      (this.chatMessage.getFlag("dnd5e", "enchanted") ?? []).map(uuid => fromUuid(uuid))
    )).filter(i => i).map(enchantment => {
      const item = enchantment.parent;
      const div = document.createElement("div");
      div.classList.add("preview");
      div.dataset.enchantmentUuid = enchantment.uuid;
      div.innerHTML = `
        <img src="${item.img}" class="gold-icon" alt="${item.name}">
        <span class="name">${item.name}</span>
      `;
      if ( item.isOwner ) {
        const control = document.createElement("a");
        control.ariaLabel = game.i18n.localize("DND5E.Enchantment.Action.Remove");
        control.dataset.action = "removeEnchantment";
        control.dataset.tooltip = "DND5E.Enchantment.Action.Remove";
        control.innerHTML = '<i class="fa-solid fa-rotate-left" inert></i>';
        div.append(control);
      }
      return div;
    });
    if ( enchantedItems.length ) {
      this.dropArea.replaceChildren(...enchantedItems);
    } else {
      this.dropArea.innerHTML = `<p>${game.i18n.localize("DND5E.Enchantment.DropArea")}</p>`;
    }
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle dropping an item onto the control.
   * @param {Event} event  Triggering drop event.
   */
  async _onDrop(event) {
    event.preventDefault();
    const data = TextEditor.getDragEventData(event);
    const effect = this.enchantmentItem.effects.get(this.chatMessage.getFlag("dnd5e", "use.enchantmentProfile"));
    if ( (data.type !== "Item") || !effect ) return;
    const droppedItem = await Item.implementation.fromDropData(data);

    // Validate against the enchantment's restraints on the origin item
    const errors = this.enchantmentItem.system.enchantment?.canEnchant(droppedItem);
    if ( errors?.length ) {
      errors.forEach(err => ui.notifications.error(err.message));
      return;
    }

    // If concentration is required, ensure it is still being maintained & GM is present
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
    const applied = await ActiveEffect.create(effectData, {
      parent: droppedItem, keepOrigin: true, chatMessageOrigin: this.chatMessage.id
    });
    if ( concentration ) await concentration.addDependent(applied);
  }

  /* -------------------------------------------- */

  /**
   * Handle removing an enchantment.
   * @param {Event} event  Triggering drop event.
   */
  async _onRemoveEnchantment(event) {
    if ( event.target.dataset.action !== "removeEnchantment" ) return;
    const enchantmentUuid = event.target.closest("[data-enchantment-uuid]")?.dataset.enchantmentUuid;
    const enchantment = await fromUuid(enchantmentUuid);
    enchantment?.delete({ chatMessageOrigin: this.chatMessage.id });
  }
}
