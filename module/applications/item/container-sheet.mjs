import ItemSheet5e from "./item-sheet.mjs";
import Item5e from "../../documents/item.mjs";
import ItemListControlsElement from "../components/item-list-controls.mjs";
import ContainerData from "../../data/item/container.mjs";

/**
 * Extended version of item sheet to handle containers.
 */
export default class ContainerSheet extends ItemSheet5e {
  /** @override */
  static DEFAULT_OPTIONS = {
    elements: {
      inventory: "dnd5e-inventory"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    contents: {
      template: "systems/dnd5e/templates/items/contents.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/encumbrance.hbs"
      ],
      scrollable: [""]
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "contents", label: "DND5E.ITEM.SECTIONS.Contents" },
    ...super.TABS
  ];

  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "contents"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  _filters = {
    inventory: { name: "", properties: new Set() }
  };

  /* -------------------------------------------- */

  /**
   * The container's cached contents.
   * @type {Item5e[]}
   * @protected
   */
  _items;

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if ( "contents" in parts ) {
      parts.contents.templates ??= [];
      parts.contents.templates.push(...customElements.get(this.options.elements.inventory).templates);
    }
    return parts;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "contents": context = await this._prepareContentsContext(context, options); break;
    }
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare rendering context for the contents tab.
   * @param {ApplicationRenderContext} context  Context being prepared.
   * @param {HandlebarsRenderOptions} options   Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareContentsContext(context, options) {
    context.items = [];
    context.itemContext = {};
    context.isContainer = true;
    context.rollableClass = this.isEditable ? "rollable" : "";
    context.encumbrance = await this.item.system.computeCapacity();
    if ( !Number.isFinite(context.encumbrance.max) ) context.encumbrance.maxLabel = "&infin;";

    // Contents
    const Inventory = customElements.get(this.options.elements.inventory);
    for ( const item of await this.item.system.contents ) {
      const ctx = context.itemContext[item.id] ??= {};
      ctx.totalWeight = (await item.system.totalWeight).toNearest(0.1);
      ctx.isExpanded = this.expandedSections.get(item.id);
      ctx.isStack = item.system.quantity > 1;
      ctx.expanded = this.expandedSections.get(item.id) ? await item.getChatData({ secrets: this.item.isOwner }) : null;
      ctx.groups = { contents: "contents", type: item.type };
      ctx.dataset = { groupContents: "contents", groupType: item.type };
      context.items.push(item);

      if ( item.type === "container" ) {
        ctx.capacity = await item.system.computeCapacity();
        ctx.capacity.maxLabel = Number.isFinite(ctx.capacity.max) ? ctx.capacity.max : "&infin;";
        ctx.columns = Inventory.mapColumns(["capacity", "controls"]);
        ctx.clickAction = "view";
      }
    }

    const inventory = Object.values(CONFIG.Item.dataModels)
      .filter(model => "inventorySection" in model)
      .map(model => {
        const section = model.inventorySection;
        if ( foundry.utils.isSubclass(model, ContainerData) ) return section;
        return { ...section, columns: ["price", "weight", "quantity", "controls"] };
      });
    inventory.push(foundry.utils.deepClone(Inventory.SECTIONS.contents));
    inventory.at(-1).items = context.items;
    inventory.forEach(s => s.minWidth = 190);
    context.inventory = Inventory.prepareSections(inventory);
    context.listControls = foundry.utils.deepClone(ItemListControlsElement.CONFIG.inventory);
    context.showCurrency = true;
    this._items = context.items;

    // TODO: Remove this temporary path to `config` when actors have converted to AppV2
    context.config = context.CONFIG;

    return context;
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDragStart(event) {
    const li = event.currentTarget;
    if ( "link" in event.target.dataset ) return;
    if ( !li.dataset.itemId ) return super._onDragStart(event);

    const item = await this.item.system.getContainedItem(li.dataset.itemId);
    const dragData = item?.toDragData();
    if ( !dragData ) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if ( !["Item", "Folder"].includes(data.type) ) return super._onDrop(event, data);

    if ( Hooks.call("dnd5e.dropItemSheetData", this.item, this, data) === false ) return;

    if ( data.type === "Folder" ) return this._onDropFolder(event, data);
    return this._onDropItem(event, data);
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of Folder data onto the Container sheet.
   * @param {DragEvent} event              The concluding DragEvent which contains the drop data.
   * @param {object} data                  The data transfer extracted from the event.
   * @returns {Promise<Item5e[]>}          The created Item objects.
   */
  async _onDropFolder(event, data) {
    const folder = await Folder.implementation.fromDropData(data);
    if ( !this.item.isOwner || (folder.type !== "Item") ) return [];

    let recursiveWarning = false;
    const parentContainers = await this.item.system.allContainers();
    const containers = new Set();

    let items = await Promise.all(folder.contents.map(async item => {
      if ( !(item instanceof Item) ) item = await fromUuid(item.uuid);
      if ( item.system.container === this.item.id ) return;
      if ( (this.item.uuid === item.uuid) || parentContainers.includes(item) ) {
        recursiveWarning = true;
        return;
      }
      if ( item.type === "container" ) containers.add(item.id);
      return item;
    }));
    items = items.filter(i => i && !containers.has(i.system.container));

    // Display recursive warning, but continue with any remaining items
    if ( recursiveWarning ) ui.notifications.warn("DND5E.ContainerRecursiveError", { localize: true });
    if ( !items.length ) return [];

    // Create any remaining items
    const toCreate = await Item5e.createWithContents(items, {
      container: this.item,
      transformAll: (itemData, options) => this._onDropSingleItem(itemData, { ...options, event })
    });
    if ( this.item.folder ) toCreate.forEach(d => d.folder = this.item.folder.id);
    return Item5e.createDocuments(toCreate, {pack: this.item.pack, parent: this.item.parent, keepId: true});
  }

  /* -------------------------------------------- */

  /**
   * Handle the dropping of Item data onto an Item Sheet.
   * @param {DragEvent} event              The concluding DragEvent which contains the drop data.
   * @param {object} data                  The data transfer extracted from the event.
   * @returns {Promise<Item5e[]|boolean>}  The created Item objects or `false` if it couldn't be created.
   * @protected
   */
  async _onDropItem(event, data) {
    const behavior = this._dropBehavior(event, data);
    const item = await Item.implementation.fromDropData(data);
    if ( !this.item.isOwner || !item || (behavior === "none") ) return false;

    // If item already exists in this container, just adjust its sorting
    if ( (behavior === "move") && (item.system.container === this.item.id) ) {
      return this._onSortItem(event, item);
    }

    // Prevent dropping containers within themselves
    const parentContainers = await this.item.system.allContainers();
    if ( (this.item.uuid === item.uuid) || parentContainers.includes(item) ) {
      ui.notifications.error("DND5E.ContainerRecursiveError", { localize: true });
      return;
    }

    // If item already exists in same DocumentCollection, just adjust its container property
    if ( (behavior === "move") && (item.actor === this.item.actor) && (item.pack === this.item.pack) ) {
      return item.update({ folder: this.item.folder, "system.container": this.item.id });
    }

    // Otherwise, create a new item & contents in this context
    const toCreate = await Item5e.createWithContents([item], {
      container: this.item,
      transformAll: (itemData, options) => this._onDropSingleItem(itemData, { ...options, event })
    });
    if ( this.item.folder ) toCreate.forEach(d => d.folder = this.item.folder.id);
    const created = Item5e.createDocuments(toCreate, { pack: this.item.pack, parent: this.item.actor, keepId: true });
    if ( behavior === "move" ) item.delete({ deleteContents: true });
    return created;
  }

  /* -------------------------------------------- */

  /**
   * Process a single item when dropping into the container.
   * @param {object} itemData           The item data to create.
   * @param {object} options
   * @param {string} options.container  ID of the container to create the items.
   * @param {number} options.depth      Current depth of the item being created.
   * @param {DragEvent} options.event   The concluding DragEvent which provided the drop data.
   * @returns {Promise<object|false>}   The item data to create after processing, or false if the item should not be
   *                                    created or creation has been otherwise handled.
   * @protected
   */
  async _onDropSingleItem(itemData, { container, depth, event }) {
    if ( itemData.type === "spell" ) {
      const scroll = await Item5e.createScrollFromSpell(itemData);
      return scroll?.toObject?.() ?? false;
    }

    if ( this.item.actor && (container === this.item.id) ) {
      const result = await this.item.actor.sheet._onDropStackConsumables(event, itemData, { container });
      if ( result ) return false;
    }

    return itemData;
  }

  /* -------------------------------------------- */

  /**
   * Handle a drop event for an existing contained Item to sort it relative to its siblings.
   * @param {DragEvent} event  The concluding DragEvent.
   * @param {Item5e} item      The item that needs to be sorted.
   * @protected
   */
  async _onSortItem(event, item) {
    const dropTarget = event.target.closest("[data-item-id]");
    if ( !dropTarget ) return;
    const contents = await this.item.system.contents;
    const target = contents.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if ( item.id === target.id ) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for ( const el of dropTarget.parentElement.children ) {
      const siblingId = el.dataset.itemId;
      if ( siblingId && (siblingId !== item.id) ) siblings.push(contents.get(siblingId));
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(item, {target, siblings});
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target.id;
      return update;
    });

    // Perform the update
    Item.updateDocuments(updateData, {pack: this.item.pack, parent: this.item.actor});
  }

  /* -------------------------------------------- */
  /*  Life-Cycle                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const inventory = this.element.querySelector(this.options.elements.inventory);
    if ( inventory ) inventory.dataset.itemId = this.item.id;
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /** @override */
  _filterChildren(collection, filters) {
    if ( collection === "items" ) return this._filterItems(this._items, filters);
    return [];
  }

  /* -------------------------------------------- */

  /**
   * Filter the container's contents based on the current set of filters.
   * @param {Item5e[]} items       The Items to filter.
   * @param {Set<string>} filters  Filters applied to the Item list.
   * @returns {Item5e[]}
   * @protected
   */
  _filterItems(items, filters) {
    const actions = ["action", "bonus", "reaction"];
    return items.filter(item => {
      // Subclass-specific logic.
      const filtered = this._filterItem(item, filters);
      if ( filtered !== undefined ) return filtered;

      // Action usage.
      for ( const action of actions ) {
        if ( filters.has(action) && (item.system.activation?.type !== action) ) return false;
      }

      // Equipment-specific filters.
      if ( filters.has("equipped") && (item.system.equipped !== true) ) return false;
      if ( filters.has("mgc") && !item.system.properties?.has("mgc") ) return false;

      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Determine whether an Item will be shown based on the current set of filters.
   * @param {Item5e} item          The Item.
   * @param {Set<string>} filters  Filters applied to the Item.
   * @returns {boolean|void}
   * @protected
   */
  _filterItem(item, filters) {
    /** @import BaseActorSheet from "../actor/api/base-actor-sheet.mjs" */

    /**
     * A hook event that fires when a sheet filters an item.
     * @function dnd5e.filterItem
     * @memberof hookEvents
     * @param {BaseActorSheet|ContainerSheet} sheet     The sheet the item is being rendered on.
     * @param {Item5e} item                             The item being filtered.
     * @param {Set<string>} filters                     Filters applied to the Item.
     * @returns {false|void} Return false to hide the item, otherwise other filters will continue to apply.
     */
    if ( Hooks.call("dnd5e.filterItem", this, item, filters) === false ) return false;
  }

  /* -------------------------------------------- */
  /*  Sorting                                     */
  /* -------------------------------------------- */

  /** @override */
  _sortChildren(collection, mode) {
    if ( collection === "items" ) return this._sortItems(this._items, mode);
    return [];
  }
}
