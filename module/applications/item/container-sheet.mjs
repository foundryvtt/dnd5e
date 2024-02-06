import Item5e from "../../documents/item.mjs";
import ItemSheet5e from "./item-sheet.mjs";

export default class ContainerSheet extends ItemSheet5e {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 540,
      scrollY: ["dnd5e-inventory .inventory-list"],
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "contents"}],
      dragDrop: [
        {dragSelector: "[data-effect-id]", dropSelector: ".effects-list"},
        {dragSelector: ".advancement-item", dropSelector: ".advancement"},
        {dragSelector: ".items-list .item", dropSelector: null}
      ],
      elements: {
        inventory: "dnd5e-inventory"
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get template() {
    return "systems/dnd5e/templates/items/container.hbs";
  }

  /* -------------------------------------------- */

  /**
   * IDs for items on the sheet that have been expanded.
   * @type {Set<string>}
   * @protected
   */
  _expanded = new Set();

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options={}) {
    const context = await super.getData(options);

    context.items = Array.from(await this.item.system.contents);
    context.capacity = await this.item.system.computeCapacity();
    context.itemContext = {};

    for ( const item of context.items ) {
      const ctx = context.itemContext[item.id] ??= {};
      ctx.totalWeight = (await item.system.totalWeight).toNearest(0.1);
      ctx.isExpanded = this._expanded.has(item.id);
      ctx.isStack = item.system.quantity > 1;
      ctx.expanded = this._expanded.has(item.id) ? await item.getChatData({secrets: this.item.isOwner}) : null;
    }
    context.isContainer = true;
    context.inventory = {
      contents: {
        label: "DND5E.Contents",
        items: context.items
      }
    };

    context.items = context.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));

    return context;
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
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
    const toCreate = await Item5e.createWithContents(items, {container: this.item});
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
    const item = await Item.implementation.fromDropData(data);
    if ( !this.item.isOwner || !item ) return false;

    // If item already exists in this container, just adjust its sorting
    if ( item.system.container === this.item.id ) {
      return this._onSortItem(event, item);
    }

    // Prevent dropping containers within themselves
    const parentContainers = await this.item.system.allContainers();
    if ( (this.item.uuid === item.uuid) || parentContainers.includes(item) ) {
      ui.notifications.error("DND5E.ContainerRecursiveError", { localize: true });
      return;
    }

    // If item already exists in same DocumentCollection, just adjust its container property
    if ( (item.actor === this.item.actor) && (item.pack === this.item.pack) ) {
      return item.update({folder: this.item.folder, "system.container": this.item.id});
    }

    // Otherwise, create a new item & contents in this context
    const toCreate = await Item5e.createWithContents([item], {
      container: this.item,
      transformAll: itemData => itemData.type === "spell" ? Item5e.createScrollFromSpell(itemData) : itemData
    });
    if ( this.item.folder ) toCreate.forEach(d => d.folder = this.item.folder.id);
    return Item5e.createDocuments(toCreate, {pack: this.item.pack, parent: this.item.actor, keepId: true});
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
}
