import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancement-config.js";
import { AdvancementFlow } from "./advancement-flow.js";


/**
 * Advancement that automatically grants one or more items to the player. Presents the player with the option of
 * skipping any or all of the items.
 *
 * @extends {Advancement}
 */
export class ItemGrantAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaults: {
        configuration: { items: [] }
      },
      order: 40,
      icon: "icons/svg/book.svg",
      title: game.i18n.localize("DND5E.AdvancementItemGrantTitle"),
      hint: game.i18n.localize("DND5E.AdvancementItemGrantHint"),
      apps: {
        config: ItemGrantConfig,
        flow: ItemGrantFlow
      }
    });
  }

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
  /* -------------------------------------------- */

  /** @inheritdoc */
  async apply(level, data) {
    const added = this.data.value.added ?? {};
    const existing = new Set(Object.values(added));
    const updates = {};

    // Figure out which items to add and which to remove
    for ( const [uuid, selected] of Object.entries(data) ) {
      // Item not on actor but needs to be added
      if ( selected && !existing.has(uuid) ) {
        const item = (await fromUuid(uuid))?.clone();
        if ( !item ) continue;
        item.data.update({
          _id: foundry.utils.randomID(),
          "flags.dnd5e.sourceId": uuid,
          "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
        });
        this.actor.items.set(item.id, item);
        // TODO: Trigger any additional advancement steps for added items
        updates[item.id] = uuid;
      }

      // Item on actor but needs to be removed
      else if ( !selected && existing.has(uuid) ) {
        const [id] = Object.entries(added).find(([, added]) => added === uuid);
        this.actor.items.delete(id);
        // TODO: Trigger any additional advancement steps for removed items
        updates[`-=${id}`] = null;
      }
    }

    this.updateSource({"value.added": updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    for ( const id of Object.keys(this.data.value.added ?? {}) ) {
      this.actor.items.delete(id);
      // TODO: Ensure any advancement data attached to these items is properly reversed
    }
    this.updateSource({ "-=added": null });
  }

}


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
    if ( item.uuid === this.item.uuid ) {
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

    // BUG: When items are dropped, any other changes are reset
    return this._updateAdvancement(updates);
  }

}


/**
 * Inline application that presents the player with a list of items to be added.
 *
 * @extends {AdvancementFlow}
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
    const checked = new Set(Object.values(value ?? {}));

    return foundry.utils.mergeObject(super.getData(), {
      items: await Promise.all(config.map(async uuid => {
        const item = await fromUuid(uuid);
        item.checked = value ? checked.has(uuid) : true;
        return item;
      }))
    });
  }

}
