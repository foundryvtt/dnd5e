import ContextMenu5e from "../context-menu.mjs";
import UtilityActivity from "../../documents/activity/utility.mjs";
import CurrencyManager from "../currency-manager.mjs";
import ItemSheet5e from "../item/item-sheet.mjs";
import { parseInputDelta } from "../../utils.mjs";
import Item5e from "../../documents/item.mjs";

/**
 * @typedef InventorySectionDescriptor
 * @property {string} id                                     The section identifier.
 * @property {number} order                                  Sections are displayed in ascending order of this value.
 * @property {Record<string, string>} groups                 Group identifiers that this section belongs to.
 * @property {string} label                                  The name of the section. Will be localized.
 * @property {number} [minWidth=200]                         The minimum width of the primary column in this section.
 *                                                           If the section is resized such that the primary column
 *                                                           would be smaller than this width, secondary columns are
 *                                                           hidden in order to retain this minimum.
 * @property {(string|InventoryColumnDescriptor)[]} columns  A list of column descriptors or IDs of well-known columns.
 * @property {Record<string, string>} [dataset]              Section data stored in the DOM.
 */

/**
 * @typedef InventoryColumnDescriptor
 * @property {string} id        The column identifier.
 * @property {string} template  The handlebars template used to render the column.
 * @property {number} width     The amount of pixels of width allocated to represent this column.
 * @property {number} order     Columns are displayed from left-to-right in ascending order of this value.
 * @property {number} priority  Columns with a higher priority take precedence when there is not enough space to
 *                              display all columns.
 */

/**
 * A custom element that handles displaying a collection of items.
 */
export default class InventoryElement extends HTMLElement {
  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  /**
   * Well-known inventory columns.
   * @type {Record<string, InventoryColumnDescriptor>}
   */
  static COLUMNS = {
    capacity: {
      id: "capacity",
      width: 200,
      order: 800,
      priority: 1000,
      template: "systems/dnd5e/templates/inventory/columns/capacity.hbs"
    },
    charges: {
      id: "charges",
      width: 70,
      order: 800,
      priority: 600,
      label: "DND5E.Charges",
      template: "systems/dnd5e/templates/inventory/columns/uses.hbs"
    },
    controls: {
      id: "controls",
      width: 70,
      order: 1000,
      priority: 1000,
      template: "systems/dnd5e/templates/inventory/columns/controls.hbs"
    },
    formula: {
      id: "formula",
      width: 80,
      order: 700,
      priority: 700,
      label: "DND5E.SpellHeader.Formula",
      template: "systems/dnd5e/templates/inventory/columns/formula.hbs"
    },
    price: {
      id: "price",
      width: 80,
      order: 300,
      priority: 300,
      label: "DND5E.Price",
      template: "systems/dnd5e/templates/inventory/columns/price.hbs"
    },
    range: {
      id: "range",
      width: 50,
      order: 300,
      priority: 800,
      label: "DND5E.SpellHeader.Range",
      template: "systems/dnd5e/templates/inventory/columns/range.hbs"
    },
    recovery: {
      id: "recovery",
      width: 60,
      order: 400,
      priority: 500,
      label: "DND5E.Recovery",
      template: "systems/dnd5e/templates/inventory/columns/recovery.hbs"
    },
    roll: {
      id: "roll",
      width: 40,
      order: 600,
      priority: 800,
      label: "DND5E.SpellHeader.Roll",
      template: "systems/dnd5e/templates/inventory/columns/roll.hbs"
    },
    school: {
      id: "school",
      width: 40,
      order: 100,
      priority: 100,
      label: "DND5E.SpellHeader.School",
      template: "systems/dnd5e/templates/inventory/columns/school.hbs"
    },
    target: {
      id: "target",
      width: 80,
      order: 400,
      priority: 800,
      label: "DND5E.SpellHeader.Target",
      template: "systems/dnd5e/templates/inventory/columns/target.hbs"
    },
    time: {
      id: "time",
      width: 40,
      order: 200,
      priority: 800,
      label: "DND5E.SpellHeader.Time",
      template: "systems/dnd5e/templates/inventory/columns/time.hbs"
    },
    quantity: {
      id: "quantity",
      width: 70,
      order: 500,
      priority: 500,
      label: "DND5E.Quantity",
      template: "systems/dnd5e/templates/inventory/columns/quantity.hbs"
    },
    uses: {
      id: "uses",
      width: 70,
      order: 500,
      priority: 600,
      label: "DND5E.Uses",
      template: "systems/dnd5e/templates/inventory/columns/uses.hbs"
    },
    weight: {
      id: "weight",
      width: 60,
      order: 400,
      priority: 400,
      label: "DND5E.Weight",
      template: "systems/dnd5e/templates/inventory/columns/weight.hbs"
    }
  };

  /* -------------------------------------------- */

  /**
   * Well-known inventory sections.
   * @type {Record<string, InventorySectionDescriptor>}
   */
  static SECTIONS = {
    contents: {
      id: "contents",
      order: 100,
      groups: { contents: "contents" },
      label: "DND5E.Contents",
      columns: ["price", "weight", "quantity", "charges", "controls"]
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The actor that manages these items.
   * @returns {Actor5e|null}
   */
  get actor() {
    if ( this.document instanceof Actor ) return this.document;
    return this.document.actor ?? null;
  }

  /**
   * Reference to the Application that contains this component.
   * @type {ApplicationV2}
   */
  get app() {
    return this.#app;
  }

  #app;

  /**
   * Can items be used from this inventory list.
   * @type {boolean}
   */
  get canUse() {
    return this.actor && this.actor.isOwner && !this.actor.pack;
  }

  /**
   * The document that holds these items.
   * @returns {Actor5e|Item5e}
   */
  get document() {
    return this.app.document;
  }

  /**
   * Cached section data to avoid expensive lookups during resize events.
   * @type {{
   *  columns: Partial<InventoryColumnDescriptor>[],
   *  elements: Record<string, HTMLElement[]>,
   *  element: HTMLElement
   * }[]}
   */
  #sections;

  /**
   * Retrieve the templates needed to render the inventory.
   * @type {string[]}
   */
  static get templates() {
    return Object.values(this.COLUMNS).map(c => c.template);
  }

  /* -------------------------------------------- */
  /*  Lifecycle                                   */
  /* -------------------------------------------- */

  /** @override */
  connectedCallback() {
    if ( this.#app ) return;
    this.#app = foundry.applications.instances.get(this.closest(".application")?.id)
      ?? ui.windows[this.closest(".app")?.dataset.appid]; // TODO: Remove when V1 sheets are gone

    if ( !this.canUse ) {
      for ( const element of this.querySelectorAll('[data-action="use"]') ) {
        delete element.dataset.action;
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
        if ( event.currentTarget.ariaDisabled === "true" ) return;
        void this._onAction(event.currentTarget, event.currentTarget.dataset.action, { event });
      });
    }

    for ( const control of this.querySelectorAll("[data-context-menu]") ) {
      control.addEventListener("click", ContextMenu5e.triggerEvent);
    }

    this.querySelectorAll("input").forEach(e => e.addEventListener("focus", () => e.select()));

    // Bind activity menu to child to work around lack of stopImmediatePropagation in ContextMenu#bind
    new ContextMenu5e(this.querySelector(".items-list"), ".activity-row[data-activity-id]", [], {
      onOpen: this._onOpenContextMenu.bind(this), jQuery: false
    });

    new ContextMenu5e(this, "[data-item-id]", [], { onOpen: this._onOpenContextMenu.bind(this), jQuery: false });

    this._cacheSections();
    const observer = new ResizeObserver(this._onResize.bind(this));
    observer.observe(this);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Cache section data to avoid expensive lookups during resize events.
   * @internal
   */
  _cacheSections() {
    this.#sections = Array.from(this.querySelectorAll(".items-section")).map(section => {
      const minWidth = Number(section.dataset.columnMinWidth);
      const descriptor = { element: section };
      if ( Number.isFinite(minWidth) ) descriptor.minWidth = minWidth;
      const columns = Array.from(section.querySelectorAll(".items-header [data-column-id]")).reduce((obj, el) => {
        const { columnId: id, columnWidth: width, columnPriority: priority } = el.dataset;
        obj[id] = { id, width: Number(width), priority: Number(priority) };
        return obj;
      }, {});
      // Descending order of priority.
      descriptor.columns = Object.values(columns).sort((a, b) => b.priority - a.priority);
      const elements = section.querySelectorAll(":is(.item-row, .items-header) [data-column-id]");
      descriptor.elements = Array.from(elements).reduce((obj, el) => {
        const { columnId: id } = el.dataset;
        const els = obj[id] ??= [];
        els.push(el);
        return obj;
      }, {});
      return descriptor;
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Prepare an array of context menu options which are available for inventory items.
   * @param {Item5e} item          The item.
   * @param {HTMLElement} element  The item's rendered element.
   * @returns {ContextMenuEntry[]}
   * @protected
   */
  _getContextOptions(item, element) {
    const compendiumLocked = game.packs.get(item.pack)?.locked;

    // Standard options.
    const options = [{
      name: "DND5E.ItemView",
      icon: '<i class="fa-solid fa-eye fa-fw"></i>',
      callback: li => this._onAction(li, "view")
    }, {
      name: "DND5E.ContextMenuActionEdit",
      icon: '<i class="fa-solid fa-edit fa-fw"></i>',
      condition: () => item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "edit")
    }, {
      name: "DND5E.ContextMenuActionDuplicate",
      icon: '<i class="fa-solid fa-copy fa-fw"></i>',
      condition: () => item.canDuplicate && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "duplicate")
    }, {
      id: "delete",
      name: "DND5E.ContextMenuActionDelete",
      icon: '<i class="fa-solid fa-trash fa-fw"></i>',
      condition: () => item.canDelete && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "delete")
    }, {
      name: "DND5E.DisplayCard",
      icon: '<i class="fa-solid fa-message"></i>',
      callback: () => item.displayCard()
    }];

    if ( !this.actor || this.actor.system.isGroup ) return options;
    const favorited = this.actor.system.hasFavorite?.(item.getRelativeUUID(this.actor));
    const expanded = this.app.expandedSections ? this.app.expandedSections.get(item.id)
      : this.app._expanded.has(item.id); // TODO: Remove when V1 sheets are gone

    // Owned item options.
    options.push({
      name: "DND5E.Scroll.CreateScroll",
      icon: '<i class="fa-solid fa-scroll"></i>',
      condition: () => {
        const isSpell = (item.type === "spell") && !item.getFlag("dnd5e", "cachedFor");
        const canEdit = this.actor.isOwner && !this.actor.collection.locked;
        return isSpell && canEdit;
      },
      callback: async () => {
        const scroll = await Item.implementation.createScrollFromSpell(item);
        if ( scroll ) void Item.implementation.create(scroll, { parent: this.actor });
      },
      group: "action"
    }, {
      name: "DND5E.ConcentrationBreak",
      icon: '<dnd5e-icon src="systems/dnd5e/icons/svg/break-concentration.svg"></dnd5e-icon>',
      condition: () => this.actor?.concentration?.items.has(item),
      callback: () => this.actor?.endConcentration(item),
      group: "state"
    }, {
      name: `DND5E.ContextMenuAction${item.system.attuned ? "Unattune" : "Attune"}`,
      icon: '<i class="fa-solid fa-sun fa-fw"></i>',
      condition: () => item.system.attunement && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "attune"),
      group: "state"
    }, {
      name: `DND5E.ContextMenuAction${item.system.equipped ? "Unequip" : "Equip"}`,
      icon: '<i class="fa-solid fa-shield-alt fa-fw"></i>',
      condition: () => ("equipped" in item.system) && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "equip"),
      group: "state"
    }, {
      name: `DND5E.ContextMenuAction${item.isOnCooldown ? "Charge" : "ExpendCharge"}`,
      icon: '<i class="fa-solid fa-bolt"></i>',
      condition: () => item.hasRecharge && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "toggleCharge"),
      group: "state"
    }, {
      name: `DND5E.ContextMenuAction${item.system.prepared ? "Unprepare" : "Prepare"}`,
      icon: '<i class="fa-solid fa-sun fa-fw"></i>',
      condition: () => {
        const isPrepared = CONFIG.DND5E.spellcasting[item.system.method]?.prepares;
        const isAlways = item.system.prepared === CONFIG.DND5E.spellPreparationStates.always.value;
        const canEdit = item.isOwner && !compendiumLocked;
        return !item.hasRecharge && isPrepared && !isAlways && canEdit && !item.getFlag("dnd5e", "cachedFor");
      },
      callback: li => this._onAction(li, "prepare"),
      group: "state"
    }, {
      name: "DND5E.Identify",
      icon: '<i class="fa-solid fa-magnifying-glass"></i>',
      condition: () => {
        const canIdentify = ("identified" in item.system) && !item.system.identified;
        const canEdit = item.isOwner && !compendiumLocked;
        return canIdentify && canEdit;
      },
      callback: li => this._onAction(li, "identify"),
      group: "state"
    }, {
      name: favorited ? "DND5E.FavoriteRemove" : "DND5E.Favorite",
      icon: '<i class="fa-solid fa-bookmark fa-fw"></i>',
      condition: () => ("favorites" in this.actor.system) && item.isOwner && !compendiumLocked,
      callback: li => this._onAction(li, "toggleFavorite"),
      group: "state"
    }, {
      name: expanded ? "Collapse" : "Expand",
      icon: `<i class="fa-solid fa-${expanded ? "compress" : "expand"}"></i>`,
      condition: () => "canExpand" in this.app ? this.app.canExpand(item) : true,
      callback: li => this._onAction(li, "toggleExpand"),
      group: "collapsible"
    });

    return options;
  }

  /* -------------------------------------------- */

  /**
   * Handle item actions.
   * @param {HTMLElement} target            The action target.
   * @param {string} action                 The action to invoke.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise}
   * @private
   */
  async _onAction(target, action, { event }={}) {
    const inventoryEvent = new CustomEvent("inventory", {
      bubbles: true,
      cancelable: true,
      detail: action
    });
    target.dispatchEvent(inventoryEvent);
    if ( inventoryEvent.defaultPrevented ) return;

    if ( action === "currency" ) return this._onManageCurrency();
    if ( action === "create" ) return this._onCreateItem(event); // TODO: Remove once legacy sheets are removed.

    const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
    const { activityId } = target.closest("[data-activity-id]")?.dataset ?? {};
    const item = await this.getItem(itemId);
    if ( !item || (target.ariaDisabled === "true") ) return;
    const activity = item.system.activities?.get(activityId);

    switch ( action ) {
      case "activity-use": return this._onUseActivity(activity, { event });
      case "attune": return this._onToggleAttunement(item);
      case "delete": return this._onDeleteItem(item);
      case "duplicate": return this._onDuplicateItem(item);
      case "edit": return this._onEditItem(item);
      case "equip": return this._onToggleEquipped(item);
      case "identify": return this._onToggleIdentify(item);
      case "prepare": return this._onTogglePrepared(item);
      case "recharge": return this._onRollRecharge(activity ?? item, { event });
      case "toggleCharge": return this._onToggleCharge(item);
      case "toggleExpand": return this._onToggleExpand(target, { item });
      case "toggleFavorite": return this._onToggleFavorite(item);
      case "use": return this._onUseItem(item, { event });
      case "view": return this._onViewItem(item);
    }
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
    input.value = Math.clamp(value, min, max);
    input._debouncedChange ??= foundry.utils.debounce(() => input.dispatchEvent(new Event("change")), 250);
    input._debouncedChange();
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
    const value = Math.clamp(event.target.valueAsNumber, min, max);
    if ( !item || Number.isNaN(value) ) return;

    event.target.value = value;
    item.update({ [event.target.dataset.name]: value });
  }

  /* -------------------------------------------- */

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs.
   * @param {Event} event  Triggering event.
   * @protected
   */
  async _onChangeInputDelta(event) {
    // If this is already handled by the parent sheet, skip.
    if ( this.#app?._onChangeInputDelta ) return;
    const input = event.target;
    const { itemId } = input.closest("[data-item-id]")?.dataset ?? {};
    const { activityId } = input.closest("[data-activity-id]")?.dataset ?? {};
    const item = await this.getItem(itemId);
    if ( !item ) return;
    const activity = item.system.activities?.get(activityId);
    const result = parseInputDelta(input, activity ?? item);
    if ( (result !== undefined) && input.dataset.name ) {
      event.stopPropagation();
      // Special case handling for Item uses.
      if ( input.dataset.name === "system.uses.value" ) {
        item.update({ "system.uses.spent": item.system.uses.max - result });
      } else if ( activity && (input.dataset.name === "uses.value") ) {
        item.updateActivity(activityId, { "uses.spent": activity.uses.max - result });
      }
      else item.update({ [input.dataset.name]: result });
    }
  }

  /* -------------------------------------------- */

  /**
   * Create an item on a legacy sheet.
   * TODO: Remove once legacy sheets are removed.
   * @param {Event} event
   * @returns {Promise<Item5e>|void}
   * @protected
   */
  _onCreateItem(event) {
    const { type } = event?.target?.dataset ?? {};
    if ( !type || !this.actor ) return;
    return foundry.documents.Item.implementation.create({
      type, name: game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(CONFIG.Item.typeLabels[type]) })
    }, { parent: this.actor });
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an item.
   * @param {Item5e} item  The item.
   * @returns {Promise}
   * @protected
   */
  _onDeleteItem(item) {
    return item.deleteDialog();
  }

  /* -------------------------------------------- */

  /**
   * Handle duplicating an item.
   * @param {Item5e} item        The item.
   * @returns {Promise<Item5e>}  The duplicated item.
   * @protected
   */
  _onDuplicateItem(item) {
    return item.clone({
      name: game.i18n.format("DOCUMENT.CopyOf", { name: item.name })
    }, { save: true, addSource: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an item.
   * @param {Item5e} item  The item.
   * @returns {Promise<ItemSheet5e2>}
   * @protected
   */
  _onEditItem(item) {
    return item.sheet.render(true, { mode: ItemSheet5e.MODES.EDIT });
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the currency management dialog.
   * @returns {Promise<CurrencyManager>}
   * @protected
   */
  _onManageCurrency() {
    return new CurrencyManager({ document: this.document }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the context menu.
   * @param {HTMLElement} element  The element the context menu was triggered for.
   * @protected
   */
  _onOpenContextMenu(element) {
    const { itemId } = element.closest("[data-item-id]")?.dataset ?? {};
    const item = this.getItem(itemId);
    if ( !item || (item instanceof Promise) ) return;
    if ( element.closest("[data-activity-id]") ) UtilityActivity.onContextMenu(item, element);
    else {
      ui.context.menuItems = this._getContextOptions(item, element);
      Hooks.callAll("dnd5e.getItemContextOptions", item, ui.context.menuItems);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle recharging an item.
   * @param {Item5e|Activity} entry         The entity being recharged.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise<Roll|void>}
   * @protected
   */
  _onRollRecharge(entry, { event }={}) {
    if ( entry instanceof Item5e ) return entry.system.uses?.rollRecharge({ apply: true, event });
    return entry.uses?.rollRecharge({ apply: true, event });
  }

  /* -------------------------------------------- */

  /**
   * Manage columns when the inventory element's inline size changes.
   * @param {ResizeObserverEntry[]} entries
   * @protected
   */
  _onResize([entry]) {
    // TODO: Should accommodate uiScale here, but probably don't want to call game.settings.get every frame.
    for ( const { columns, elements, minWidth=200 } of this.#sections ) {
      let available = entry.borderBoxSize[0].inlineSize;
      for ( const { id, width } of columns ) {
        available -= width;
        if ( !(id in elements) ) continue;
        for ( const el of elements[id] ) el.classList.toggle("hidden-width", available < minWidth);
      }
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's attunement status.
   * @param {Item5e} item  The item.
   * @returns {Promise<Item5e>}
   * @protected
   */
  _onToggleAttunement(item) {
    return item.update({ "system.attuned": !item.system.attuned });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's charged state.
   * @param {Item5e} item  The item.
   * @returns {Promise<Item5e>}
   * @protected
   */
  _onToggleCharge(item) {
    return item.update({ "system.uses.spent": 1 - item.system.uses.spent });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's equipped state.
   * @param {Item5e} item  The item.
   * @returns {Promise<Item5e>}
   * @protected
   */
  _onToggleEquipped(item) {
    return item.update({ "system.equipped": !item.system.equipped });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's identified state.
   * @param {Item5e} item  The item.
   * @returns {Promise<Item5e>}
   * @protected
   */
  _onToggleIdentify(item) {
    return item.update({ "system.identified": !item.system.identified });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's in-line description.
   * @param {HTMLElement} target     The action target.
   * @param {object} [options]
   * @param {Item5e} [options.item]  The item instance, otherwise it will be inferred from the target.
   * @protected
   */
  async _onToggleExpand(target, { item }={}) {
    // TODO: Remove when V1 sheets are gone
    if ( !this.app.expandedSections ) {
      const li = target.closest("[data-item-id]");
      if ( this.app._expanded.has(item.id) ) {
        const summary = $(li.querySelector(".item-summary"));
        summary.slideUp(200, () => summary.remove());
        this.app._expanded.delete(item.id);
      } else {
        const chatData = await item.getChatData({secrets: this.document.isOwner});
        const summary = $(await foundry.applications.handlebars.renderTemplate(
          "systems/dnd5e/templates/items/parts/item-summary.hbs", chatData
        ));
        $(li).append(summary.hide());
        summary.slideDown(200);
        this.app._expanded.add(item.id);
      }
      return;
    }

    const icon = target.querySelector(":scope > i");
    const row = target.closest("[data-uuid]");
    const summary = row.querySelector(":scope > .item-description > .wrapper");
    const { uuid } = row.dataset;
    item ??= await fromUuid(uuid);
    if ( !item ) return;

    const expanded = this.app.expandedSections.get(item.id);
    if ( expanded ) {
      summary.parentElement.addEventListener("transitionend", () => {
        if ( row.classList.contains("collapsed") ) summary.querySelector(".item-summary")?.remove();
      }, { once: true });
      this.app.expandedSections.set(item.id, false);
    } else {
      const context = await item.getChatData({ secrets: item.isOwner });
      const template = "systems/dnd5e/templates/items/parts/item-summary.hbs";
      const content = await foundry.applications.handlebars.renderTemplate(template, context);
      summary.querySelectorAll(".item-summary").forEach(el => el.remove());
      summary.insertAdjacentHTML("beforeend", content);
      await new Promise(resolve => requestAnimationFrame(resolve));
      this.app.expandedSections.set(item.id, true);
    }

    row.classList.toggle("collapsed", expanded);
    icon.classList.toggle("fa-compress", !expanded);
    icon.classList.toggle("fa-expand", expanded);
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling an item's favorited status.
   * @param {Item5e} item  The item.
   * @returns {Promise<Actor5e|void>}
   * @protected
   */
  async _onToggleFavorite(item) {
    if ( !this.actor ) return;
    const uuid = item.getRelativeUUID(this.actor);
    if ( this.actor.system.hasFavorite(uuid) ) return this.actor.system.removeFavorite(uuid);
    return this.actor.system.addFavorite({ type: "item", id: uuid });
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling a spell's prepared state.
   * @param {Item5e} item  The spell.
   * @returns {Promise<Item5e>}
   * @protected
   */
  _onTogglePrepared(item) {
    return item.update({ "system.prepared": Number(!item.system.prepared) });
  }

  /* -------------------------------------------- */

  /**
   * Handle using an activity.
   * @param {Activity} activity             The activity.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise<ActivityUsageResults|void>}
   * @protected
   */
  _onUseActivity(activity, { event }={}) {
    return activity?.use({ event });
  }

  /* -------------------------------------------- */

  /**
   * Handle activating an item.
   * @param {Item5e} item                   The item.
   * @param {object} [options]
   * @param {PointerEvent} [options.event]  The triggering event.
   * @returns {Promise<ActivityUsageResults|ChatMessage|object|void>}
   * @protected
   */
  _onUseItem(item, { event }={}) {
    return item.use({ event });
  }

  /* -------------------------------------------- */

  /**
   * Handle viewing an item.
   * @param {Item5e} item  The item.
   * @returns {Promise<ItemSheet5e2>}
   * @protected
   */
  _onViewItem(item) {
    return item.sheet.render(true, { mode: ItemSheet5e.MODES.PLAY });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Retrieve an item by its ID.
   * @param {string} id  The Item ID.
   * @returns {Item5e|Promise<Item5e>}
   */
  getItem(id) {
    if ( (this.document instanceof Item) && (this.document.type === "container") ) {
      return this.document.system.getContainedItem(id);
    }
    return this.actor?.items.get(id);
  }

  /* -------------------------------------------- */

  /**
   * Map column descriptors to their renderable form.
   * @param {(string|InventoryColumnDescriptor)[]} cols
   * @returns {InventoryColumnDescriptor[]}
   */
  static mapColumns(cols) {
    return cols.flatMap(c => {
      if ( typeof c === "string" ) return foundry.utils.deepClone(this.COLUMNS[c]) ?? [];
      return foundry.utils.mergeObject(this.COLUMNS[c.id] ?? {}, c, { inplace: false });
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare section descriptors for rendering.
   * @param {Partial<InventorySectionDescriptor>[]} sections
   * @returns {InventorySectionDescriptor[]}
   */
  static prepareSections(sections) {
    for ( const section of sections ) {
      section.items ??= [];
      section.order ??= 0;
      section.dataset ??= {};
      Object.assign(section.dataset, Object.fromEntries(Object.entries(section.groups ?? {}).map(([k, v]) => {
        return [`group-${k}`, v];
      })));
      section.columns = this.mapColumns(section.columns).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if ( Number.isFinite(section.minWidth) ) section.dataset.columnMinWidth = `${section.minWidth}`;
    }
    return sections.sort((a, b) => a.order - b.order);
  }

  /* -------------------------------------------- */

  /**
   * Return the union of all columns that need to be rendered in order to satisfy every rendered section.
   * @param {Partial<InventorySectionDescriptor>[]} sections
   * @returns {(string|InventoryColumnDescriptor)[]}
   */
  static unionColumns(sections) {
    const ids = new Set();
    const cols = [];
    sections.flatMap(s => s.columns).forEach(col => {
      const id = typeof col === "string" ? col : col.id;
      if ( !ids.has(id) ) {
        ids.add(id);
        cols.push(col);
      }
    });
    return cols;
  }
}
