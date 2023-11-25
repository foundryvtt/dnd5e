import AdvancementManager from "../advancement/advancement-manager.mjs";

/**
 * Custom element that handles displaying actor & container inventories.
 */
export default class InventoryElement extends HTMLElement {
  connectedCallback() {
    this.#app = ui.windows[this.closest(".app")?.dataset.appid];

    if ( !this.canUse ) {
      for ( const element of this.querySelectorAll('[data-action="use"]') ) {
        element.dataset.action = null;
        element.closest(".rollable")?.classList.remove("rollable");
      }
    }

    for ( const input of this.querySelectorAll("input") ) {
      input.addEventListener("change", this.#onChangeInput.bind(this));
    }

    for ( const control of this.querySelectorAll(".item-action[data-action]") ) {
      control.addEventListener("click", this.#onItemAction.bind(this));
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Reference to the application that contains this component.
   * @type {Application}
   */
  #app;

  /* -------------------------------------------- */

  /**
   * Can items be used directly from the inventory?
   * @type {boolean}
   */
  get canUse() {
    return !(!this.actor || !this.actor.isOwner || this.actor.pack);
  }

  /* -------------------------------------------- */

  /**
   * Containing actor for this inventory, either the document or its parent if document is an item.
   * @type {Actor5e|null}
   */
  get actor() {
    if ( this.document instanceof Actor ) return this.document;
    return this.document.actor ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Document whose inventory is represented.
   * @type {Actor5e|Item5e}
   */
  get document() {
    return this.#app.document;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve an item with the specified ID.
   * @param {string} id
   * @returns {Promise<Item5e>}
   */
  async getItem(id) {
    if ( this.document.type === "backpack" ) return this.document.system.getContainedItem(id);
    return this.document.items.get(id);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle changing the quantity or charges fields.
   * @param {Event} event  Triggering change event.
   * @returns {Promise}
   */
  async #onChangeInput(event) {
    const itemId = event.target.closest("[data-item-id]")?.dataset.itemId;
    if ( !itemId ) return;

    event.stopImmediatePropagation();
    const item = await this.getItem(itemId);
    const min = event.target.min !== "" ? Number(event.target.min) : -Infinity;
    const max = event.target.max !== "" ? Number(event.target.max) : Infinity;
    const value = Math.clamped(event.target.valueAsNumber, min, max);
    if ( !item || Number.isNaN(value) ) return;

    event.target.value = value;
    item.update({[event.target.dataset.name]: value});
  }

  /* -------------------------------------------- */

  /**
   * Handle item actions.
   * @param {PointerEvent} event  Triggering click event.
   * @returns {Promise}
   */
  async #onItemAction(event) {
    event.stopImmediatePropagation();
    const action = event.currentTarget.dataset.action;
    const li = event.target.closest(".item");
    const itemId = li.dataset.itemId;
    const item = await this.getItem(itemId);
    if ( !item ) return;

    switch ( action ) {
      case "delete":
        // If item has advancement, handle it separately
        if ( (this.document instanceof Actor) && !game.settings.get("dnd5e", "disableAdvancements") ) {
          const manager = AdvancementManager.forDeletedItem(this.actor, item.id);
          if ( manager.steps.length ) {
            try {
              const shouldRemoveAdvancements = await AdvancementConfirmationDialog.forDelete(item);
              if ( shouldRemoveAdvancements ) return manager.render(true);
              return item.delete({ shouldRemoveAdvancements });
            } catch(err) {
              return;
            }
          }
        }
        return item.deleteDialog();
      case "edit":
        return item.sheet.render(true);
      case "expand":
        if ( this.#app._expanded.has(itemId) ) {
          const summary = $(li.querySelector(".item-summary"));
          summary.slideUp(200, () => summary.remove());
          this.#app._expanded.delete(item.id);
        } else {
          const chatData = await item.getChatData({secrets: this.document.isOwner});
          const summary = $(await renderTemplate("systems/dnd5e/templates/items/parts/item-summary.hbs", chatData));
          $(li).append(summary.hide());
          summary.slideDown(200);
          this.#app._expanded.add(item.id);
        }
        return;
      case "toggle":
        const attr = item.type === "spell" ? "system.preparation.prepared" : "system.equipped";
        return item.update({[attr]: !foundry.utils.getProperty(item, attr)});
      case "use":
        return item.use({}, { event });
    }
  }
  
  
}
