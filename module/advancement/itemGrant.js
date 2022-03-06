import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancementConfig.js";
import { AdvancementFlow } from "./advancementFlow.js";

/**
 * Configuration application for item grants.
 *
 * @extends {AdvancementConfig}
 */
export class ItemGrantConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/item-grant-config.html"
    });
  }


  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    // Remove an item from the list
    html.on("click", ".item-delete", this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Item entry from the Advancement.
   * @param {Event} event  The originating click event.
   * @returns {Promise<Item5e>}  The promise for the updated parent Item which resolves after the application re-renders
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest("[data-item-uuid]")?.dataset.itemUuid;
    if ( !uuidToDelete ) return;
    const items = this.advancement.data.configuration.items.filter(uuid => uuid !== uuidToDelete);
    const updates = { configuration: this.prepareConfigurationUpdate({ items }) };
    return this._updateAdvancement(updates);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    const existingItems = this.advancement.data.configuration.items;

    // Abort if this uuid is the parent item
    if ( item.uuid === this.parent.uuid ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.AdvancementItemGrantRecursiveWarning"));
    }

    // Abort if this uuid exists already
    if ( existingItems.includes(item.uuid) ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.AdvancementItemGrantDuplicateWarning"));
    }

    const updates = {
      configuration: this.prepareConfigurationUpdate({
        items: [
          ...existingItems,
          item.uuid
        ]
      })
    };

    return this._updateAdvancement(updates);
  }

}


/**
 * Inline application that presents the player with a list of items to be added.
 */
export class ItemGrantFlow extends AdvancementFlow {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/item-grant-flow.html"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const config = this.advancement.data.configuration.items;
    const value = this.advancement.data.value.added;
    const checked = value ? new Set(Object.values(value)) : undefined;

    return foundry.utils.mergeObject(super.getData(), {
      items: await Promise.all(config.map(async (uuid) => {
        const item = await fromUuid(uuid);
        item.checked = checked?.has(uuid) ?? true;
        return item;
      }))
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  finalizeUpdate(update, itemsAdded) {
    // Add any added items to the advancement's value
    const uuids = new Set(Object.keys(update));
    const added = itemsAdded.reduce((obj, item) => {
      if ( uuids.has(item.data.flags.dnd5e?.sourceId) ) obj[item.id] = item.data.flags.dnd5e.sourceId;
      return obj;
    }, {});

    // Remove any deleted items from advancement value
    const reverseLookup = Object.fromEntries(Object.entries(this.advancement.data.value.added ?? {}).map(a => [a[1], a[0]]));
    for ( const [uuid, selected] of Object.entries(update) ) {
      if ( selected || !reverseLookup[uuid] ) continue;
      added[`-=${reverseLookup[uuid]}`] = null;
    }

    return { added };
  }

}


/**
 * Advancement that automatically grants one or more items to the player. Presents the player with the option of
 * skipping any or all of the items.
 *
 * @extends {Advancement}
 */
export class ItemGrantAdvancement extends Advancement {

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultConfiguration = {
    items: []
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  static order = 40;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultTitle = "DND5E.AdvancementItemGrantTitle";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defaultIcon = "icons/svg/book.svg";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static hint = "DND5E.AdvancementItemGrantHint";


  /* -------------------------------------------- */

  /** @inheritdoc */
  static configApp = ItemGrantConfig;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static flowApp = ItemGrantFlow;

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !foundry.utils.isObjectEmpty(this.data.value);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level) {
    // TODO: For levels that a character has already gained, these links should point to the item on the character
    // and any items that were skipped shouldn't be listed
    return this.data.configuration.items.reduce((html, uuid) => html + game.dnd5e.utils._linkForUuid(uuid), "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /*--------------------------------------------- */

  /** @inheritdoc */
  itemUpdates({ level, updates, reverse=false }) {
    // TODO: Ensure there isn't a situation where reverse is used with updates
    if ( reverse ) return { add: [], remove: Array.from(Object.keys(this.data.value?.added ?? {})) };
    if ( !updates ) return { add: Array.from(Object.values(this.data.value?.added ?? {})), remove: [] };

    const existing = new Set(Object.values(this.data.value?.added ?? {}));
    return Object.entries(updates).reduce((obj, [uuid, selected]) => {
      if ( selected && !existing.has(uuid) ) obj.add.push(uuid);
      else if ( !selected && existing.has(uuid) ) {
        const id = Object.entries(this.data.value?.added ?? {}).find(o => o[1] === uuid);
        obj.remove.push(id[0]);
      }
      return obj;
    }, { add: [], remove: [] });
  }

}
