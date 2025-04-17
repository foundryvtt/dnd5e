import ItemSheet5e from "./item-sheet.mjs";

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
    sheet: "contents"
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * IDs for items on the sheet that have been expanded.
   * @type {Set<string>}
   * @protected
   */
  _expanded = new Set();

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

    context.encumbrance = await this.item.system.computeCapacity();
    if ( !Number.isFinite(context.encumbrance.max) ) context.encumbrance.maxLabel = "&infin;";

    // Contents
    for ( const item of await this.item.system.contents ) {
      const ctx = context.itemContext[item.id] ??= {};
      ctx.totalWeight = (await item.system.totalWeight).toNearest(0.1);
      ctx.isExpanded = this._expanded.has(item.id);
      ctx.isStack = item.system.quantity > 1;
      ctx.expanded = this._expanded.has(item.id) ? await item.getChatData({ secrets: this.item.isOwner }) : null;
      context.items.push(item);
    }
    context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.rollableClass = this.isEditable ? "rollable" : "";

    const inventory = {};
    const inventoryTypes = Object.entries(CONFIG.Item.dataModels)
      .filter(([, model]) => model.metadata?.inventoryItem)
      .sort(([, lhs], [, rhs]) => lhs.metadata.inventoryOrder - rhs.metadata.inventoryOrder);

    for ( const [type] of inventoryTypes ) {
      inventory[type] = { label: `${CONFIG.Item.typeLabels[type]}Pl`, items: [], dataset: { type } };
    }

    delete inventory.containers;
    [context.items, context.containers] = context.items.partition(item => item.type === "container");
    context.inventory = Object.values(inventory);
    context.inventory.push({ label: "DND5E.Contents", items: context.items, dataset: { type: "all" } });

    for ( const container of context.containers ) {
      const ctx = context.itemContext[container.id];
      ctx.capacity = await container.system.computeCapacity();
    }

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
    if ( event.target.classList.contains("content-link") ) return;
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
    const data = TextEditor.getDragEventData(event);
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
      const result = await this.item.actor.sheet._onDropStackConsumables(itemData, { container });
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
    const sortUpdates = SortingHelpers.performIntegerSort(item, {target, siblings});
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target.id;
      return update;
    });

    // Perform the update
    Item.updateDocuments(updateData, {pack: this.item.pack, parent: this.item.actor});
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
    if ( item.type === "container" ) return true;
  }
}
