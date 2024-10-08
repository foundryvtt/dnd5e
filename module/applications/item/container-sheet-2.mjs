import ContainerSheet from "./container-sheet.mjs";
import ItemSheetV2Mixin from "./sheet-v2-mixin.mjs";

export default class ContainerSheet2 extends ItemSheetV2Mixin(ContainerSheet) {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "sheet", "item"],
      width: 500,
      height: "auto",
      resizable: false,
      scrollY: [".tab.active"]
    });
  }

  /**
   * The container's cached contents.
   * @type {Item5e[]}
   * @protected
   */
  _items;

  /* -------------------------------------------- */

  /** @override */
  get template() {
    return "systems/dnd5e/templates/items/item-sheet-2.hbs";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData(options) {
    const context = await super.getData(options);

    context.items = [];
    context.itemContext = {};
    context.encumbrance = await this.item.system.computeCapacity();
    context.isContainer = true;

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
    return context;
  }

  /* -------------------------------------------- */
  /*  Filtering                                   */
  /* -------------------------------------------- */

  /**
   * Filter the container's contents based on the current set of filters.
   * @param {string} collection    The embedded collection name.
   * @param {Set<string>} filters  Filters to apply to the children.
   * @returns {Document[]}
   * @protected
   */
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
