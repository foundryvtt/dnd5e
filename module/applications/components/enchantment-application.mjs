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
   * Area where the enchantment limit & current count is displayed.
   * @type {HTMLElement}
   */
  countArea;

  /* -------------------------------------------- */

  /**
   * Area where items can be dropped to enchant.
   * @type {HTMLElement}
   */
  dropArea;

  /* -------------------------------------------- */

  /**
   * Activity providing the enchantment that will be applied.
   * @type {Item5e}
   */
  get enchantmentActivity() {
    return this.chatMessage.getAssociatedActivity();
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
      div.classList.add("enchantment-control");
      div.innerHTML = '<div class="drop-area"></div>';
      this.replaceChildren(div);
      this.dropArea = div.querySelector(".drop-area");
      this.addEventListener("drop", this._onDrop.bind(this));
      this.addEventListener("click", this._onRemoveEnchantment.bind(this));
    }

    // Calculate the maximum targets
    let item = this.enchantmentItem;
    const scaling = this.chatMessage.getFlag("dnd5e", "scaling");
    if ( scaling ) item = item.clone({ "flags.dnd5e.scaling": scaling });
    const activity = item.system.activities.get(this.enchantmentActivity.id);
    const maxTargets = activity.target?.affects?.count;
    if ( maxTargets ) {
      if ( !this.countArea ) {
        const div = document.createElement("div");
        div.classList.add("count-area");
        this.querySelector(".enchantment-control").append(div);
        this.countArea = this.querySelector(".count-area");
      }
      this.countArea.innerHTML = game.i18n.format("DND5E.ENCHANT.Enchanted", {
        current: '<span class="current">0</span>',
        max: `<span class="max">${maxTargets}<span>`
      });
    } else if ( this.countArea ) {
      this.countArea.remove();
    }

    this.buildItemList();
  }

  /* -------------------------------------------- */

  /**
   * Build a list of enchanted items. Will be called whenever the enchanted items are changed in order to update
   * the card list.
   */
  buildItemList() {
    const enchantedItems = dnd5e.registry.enchantments.applied(this.enchantmentActivity.uuid).map(enchantment => {
      const item = enchantment.parent;
      const div = document.createElement("div");
      div.classList.add("preview");
      div.dataset.enchantmentUuid = enchantment.uuid;
      div.innerHTML = `
        <img class="gold-icon">
        <span class="name"></span>
      `;
      Object.assign(div.querySelector("img"), { alt: item.name, src: item.img });
      div.querySelector(".name").append(item.name);
      if ( item.isOwner ) {
        const control = document.createElement("a");
        control.ariaLabel = game.i18n.localize("DND5E.ENCHANTMENT.Action.Remove");
        control.dataset.action = "removeEnchantment";
        control.dataset.tooltip = "DND5E.ENCHANTMENT.Action.Remove";
        control.innerHTML = '<i class="fa-solid fa-rotate-left" inert></i>';
        div.append(control);
      }
      return div;
    });
    if ( enchantedItems.length ) this.dropArea.replaceChildren(...enchantedItems);
    else this.dropArea.innerHTML = `<p>${game.i18n.localize("DND5E.ENCHANT.DropArea")}</p>`;
    if ( this.countArea ) this.countArea.querySelector(".current").innerText = enchantedItems.length;
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
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const droppedItem = await Item.implementation.fromDropData(data);
    if ( !droppedItem ) return;

    // If concentration is required, ensure it is still being maintained & GM is present
    const concentrationId = this.chatMessage.getFlag("dnd5e", "use.concentrationId");
    const concentration = this.enchantmentActivity.actor.effects.get(concentrationId);
    if ( concentrationId && !concentration ) {
      ui.notifications.error("DND5E.ENCHANT.Warning.ConcentrationEnded", { console: false, localize: true });
      return;
    }

    this.enchantmentActivity.applyEnchantment(
      this.chatMessage.getFlag("dnd5e", "use.enchantmentProfile"),
      droppedItem,
      { chatMessage: this.chatMessage, concentration }
    );
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
