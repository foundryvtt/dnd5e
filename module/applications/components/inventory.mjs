import {parseInputDelta} from "../../utils.mjs";
import CurrencyManager from "../currency-manager.mjs";
import ContextMenu5e from "../context-menu.mjs";

/**
 * Custom element that handles displaying actor & container inventories.
 */
export default class InventoryElement extends HTMLElement {
  connectedCallback() {
    this.#app = ui.windows[this.closest(".app")?.dataset.appid];

    this._initializeFilterLists();

    if ( !this.canUse ) {
      for ( const element of this.querySelectorAll('[data-action="use"]') ) {
        element.dataset.action = null;
        element.closest(".rollable")?.classList.remove("rollable");
      }
    }

    for ( const input of this.querySelectorAll('input[type="number"]') ) {
      input.addEventListener("change", this._onChangeInput.bind(this));
    }

    for ( const input of this.querySelectorAll('input[inputmode="numeric"]') ) {
      input.addEventListener("change", this._onChangeInputDelta.bind(this));
    }

    for ( const button of this.querySelectorAll(".adjustment-button") ) {
      button.addEventListener("click", this._onAdjustInput.bind(this));
    }

    for ( const control of this.querySelectorAll(".item-action[data-action]") ) {
      control.addEventListener("click", event => {
        this._onAction(event.currentTarget, event.currentTarget.dataset.action);
      });
    }

    for ( const control of this.querySelectorAll("[data-context-menu]") ) {
      control.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-item-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    }

    const MenuCls = this.hasAttribute("v2") ? ContextMenu5e : ContextMenu;
    new MenuCls(this, "[data-item-id]", [], {onOpen: this._onOpenContextMenu.bind(this)});
  }

  /* -------------------------------------------- */

  /**
   * Prepare filter lists and attach their listeners.
   * @protected
   */
  _initializeFilterLists() {
    const filterLists = this.querySelectorAll(".filter-list");
    if ( !this._app._filters || !filterLists.length ) return;

    // Activate the set of filters which are currently applied
    for ( const list of filterLists ) {
      const state = this._app._filters[list.dataset.filter];
      if ( !state ) continue;
      const set = state.properties;
      const filters = list.querySelectorAll(".filter-item");
      for ( const filter of filters ) {
        if ( set.has(filter.dataset.filter) ) filter.classList.add("active");
        filter.addEventListener("click", () => {
          const f = filter.dataset.filter;
          if ( set.has(f) ) set.delete(f);
          else set.add(f);
          filter.classList.toggle("active", set.has(f));
          this._applyFilters(state);
        });
      }
      this._applyFilters(state);
    }
  }

  /* -------------------------------------------- */

  /**
   * TODO: Remove filtering code from dnd5e-inventory when all sheets use item-list-controls.
   * Apply the current set of filters to the inventory list.
   * @param {FilterState5e} state  The filter state to apply.
   * @protected
   */
  _applyFilters(state) {
    let items = this._app._filterItems?.(this._app.object.items, state.properties);
    if ( !items ) return;
    const elementMap = {};
    this.querySelectorAll(".inventory-list .item-list .item").forEach(el => {
      elementMap[el.dataset.itemId] = el;
      el.hidden = true;
    });
    for ( const item of items ) {
      const el = elementMap[item.id];
      if ( el ) el.hidden = false;
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

  /**
   * Reference to the application that contains this component.
   * @type {Application}
   * @protected
   */
  get _app() { return this.#app; }

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
    return this._app.document;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve an item with the specified ID.
   * @param {string} id
   * @returns {Item5e|Promise<Item5e>}
   */
  getItem(id) {
    if ( this.document.type === "container" ) return this.document.system.getContainedItem(id);
    return this.document.items.get(id);
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Prepare an array of context menu options which are available for inventory items.
   * @param {Item5e} item           The Item for which the context menu is activated.
   * @returns {ContextMenuEntry[]}  An array of context menu options offered for the Item.
   * @protected
   */
  _getContextOptions(item) {
    // Standard Options
    const options = [
      {
        name: "DND5E.ContextMenuActionEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onAction(li[0], "edit")
      },
      {
        name: "DND5E.ItemView",
        icon: '<i class="fas fa-eye"></i>',
        condition: () => !item.isOwner,
        callback: li => this._onAction(li[0], "view")
      },
      {
        name: "DND5E.ContextMenuActionDuplicate",
        icon: "<i class='fas fa-copy fa-fw'></i>",
        condition: () => !item.system.metadata?.singleton && !["class", "subclass"].includes(item.type) && item.isOwner,
        callback: li => this._onAction(li[0], "duplicate")
      },
      {
        name: "DND5E.ContextMenuActionDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onAction(li[0], "delete")
      }
    ];

    if ( !this.actor || (this.actor.type === "group") ) return options;

    // Toggle Attunement State
    if ( ("attunement" in item.system) && (item.system.attunement !== CONFIG.DND5E.attunementTypes.NONE) ) {
      const isAttuned = item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
      options.push({
        name: isAttuned ? "DND5E.ContextMenuActionUnattune" : "DND5E.ContextMenuActionAttune",
        icon: "<i class='fas fa-sun fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onAction(li[0], "attune"),
        group: "state"
      });
    }

    // Toggle Equipped State
    if ( "equipped" in item.system ) options.push({
      name: item.system.equipped ? "DND5E.ContextMenuActionUnequip" : "DND5E.ContextMenuActionEquip",
      icon: "<i class='fas fa-shield-alt fa-fw'></i>",
      condition: () => item.isOwner,
      callback: li => this._onAction(li[0], "equip"),
      group: "state"
    });

    // Toggle Prepared State
    else if ( ("preparation" in item.system) && (item.system.preparation?.mode === "prepared") ) options.push({
      name: item.system?.preparation?.prepared ? "DND5E.ContextMenuActionUnprepare" : "DND5E.ContextMenuActionPrepare",
      icon: "<i class='fas fa-sun fa-fw'></i>",
      condition: () => item.isOwner,
      callback: li => this._onAction(li[0], "prepare"),
      group: "state"
    });

    // Identification
    if ( "identified" in item.system ) options.push({
      name: "DND5E.Identify",
      icon: '<i class="fas fa-magnifying-glass"></i>',
      condition: () => item.isOwner && !item.system.identified,
      callback: () => item.update({ "system.identified": true }),
      group: "state"
    });

    // Toggle Favorite State
    if ( ("favorites" in this.actor.system) ) {
      const uuid = item.getRelativeUUID(this.actor);
      const isFavorited = this.actor.system.hasFavorite(uuid);
      options.push({
        name: isFavorited ? "DND5E.FavoriteRemove" : "DND5E.Favorite",
        icon: "<i class='fas fa-star fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onAction(li[0], isFavorited ? "unfavorite" : "favorite"),
        group: "state"
      });
    }

    return options;
  }

  /* -------------------------------------------- */

  /**
   * Handle changing the quantity or charges fields.
   * @param {Event} event  Triggering change event.
   * @returns {Promise}
   * @protected
   */
  async _onChangeInput(event) {
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
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  async _onChangeInputDelta(event) {
    const input = event.target;
    const itemId = input.closest("[data-item-id]")?.dataset.itemId;
    const item = await this.getItem(itemId);
    if ( !item ) return;
    const result = parseInputDelta(input, item);
    if ( result !== undefined ) item.update({ [input.dataset.name]: result });
  }

  /* -------------------------------------------- */

  /**
   * Handle incrementing or decrementing a numeric input.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  _onAdjustInput(event) {
    const button = event.currentTarget;
    const { action } = button.dataset;
    const input = button.parentElement.querySelector("input");
    const min = input.min ? Number(input.min) : -Infinity;
    const max = input.max ? Number(input.max) : Infinity;
    let value = Number(input.value);
    if ( isNaN(value) ) return;
    value += action === "increase" ? 1 : -1;
    input.value = Math.clamped(value, min, max);
    input.dispatchEvent(new Event("change"));
  }

  /* -------------------------------------------- */

  /**
   * Handle item actions.
   * @param {Element} target  Button or context menu entry that triggered this action.
   * @param {string} action   Action being triggered.
   * @returns {Promise}
   * @protected
   */
  async _onAction(target, action) {
    const event = new CustomEvent("inventory", {
      bubbles: true,
      cancelable: true,
      detail: action
    });
    if ( target.dispatchEvent(event) === false ) return;

    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = await this.getItem(itemId);
    if ( !["create", "currency"].includes(action) && !item ) return;

    switch ( action ) {
      case "attune":
        const isAttuned = item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
        return item.update({
          "system.attunement": CONFIG.DND5E.attunementTypes[isAttuned ? "REQUIRED" : "ATTUNED"]
        });
      case "create":
        if ( this.document.type === "container" ) return;
        return this._onCreate(target);
      case "crew":
        return item.update({"system.crewed": !item.system.crewed});
      case "currency":
        return new CurrencyManager(this.document).render(true);
      case "delete":
        return item.deleteDialog();
      case "duplicate":
        return item.clone({name: game.i18n.format("DOCUMENT.CopyOf", {name: item.name})}, {save: true});
      case "edit":
      case "view":
        return item.sheet.render(true);
      case "equip":
        return item.update({"system.equipped": !item.system.equipped});
      case "expand":
        return this._onExpand(target, item);
      case "favorite":
        return this.actor.system.addFavorite({type: "item", id: item.getRelativeUUID(this.actor)});
      case "prepare":
        return item.update({"system.preparation.prepared": !item.system.preparation?.prepared});
      case "recharge":
        return item.rollRecharge();
      case "unfavorite":
        return this.actor.system.removeFavorite(item.getRelativeUUID(this.actor));
      case "use":
        return item.use({}, { event });
    }
  }

  /* -------------------------------------------- */

  /**
   * Create a new item.
   * @param {HTMLElement} target  Button or context menu entry that triggered this action.
   * @returns {Promise<Item5e>}
   */
  async _onCreate(target) {
    const dataset = (target.closest(".spellbook-header") ?? target).dataset;
    const type = dataset.type;

    // Check to make sure the newly created class doesn't take player over level cap
    if ( type === "class" && (this.actor.system.details.level + 1 > CONFIG.DND5E.maxLevel) ) {
      const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel});
      ui.notifications.error(err);
      return null;
    }

    const itemData = {
      name: game.i18n.format("DND5E.ItemNew", {type: game.i18n.localize(CONFIG.Item.typeLabels[type])}),
      type,
      system: foundry.utils.expandObject({ ...dataset })
    };
    delete itemData.system.type;
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /* -------------------------------------------- */

  /**
   * Expand or collapse an item's summary.
   * @param {HTMLElement} target  Button or context menu entry that triggered this action.
   * @param {Item5e} item         Item to being expanded or collapsed.
   */
  async _onExpand(target, item) {
    const li = target.closest("[data-item-id]");
    if ( this._app._expanded.has(item.id) ) {
      const summary = $(li.querySelector(".item-summary"));
      summary.slideUp(200, () => summary.remove());
      this._app._expanded.delete(item.id);
    } else {
      const enrichment = {secrets: this.document.isOwner};
      const chatData = item.system.getCardData ? item.system.getCardData(enrichment) : item.getChatData(enrichment);
      const summary = $(await renderTemplate("systems/dnd5e/templates/items/parts/item-summary.hbs", await chatData));
      $(li).append(summary.hide());
      summary.slideDown(200);
      this._app._expanded.add(item.id);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the context menu.
   * @param {HTMLElement} element  The element the context menu was triggered on.
   * @protected
   */
  _onOpenContextMenu(element) {
    const item = this.getItem(element.closest("[data-item-id]")?.dataset.itemId);
    // Parts of ContextMenu doesn't play well with promises, so don't show menus for containers in packs
    if ( !item || (item instanceof Promise) ) return;
    ui.context.menuItems = this._getContextOptions(item);
    Hooks.call("dnd5e.getItemContextOptions", item, ui.context.menuItems);
  }
}
