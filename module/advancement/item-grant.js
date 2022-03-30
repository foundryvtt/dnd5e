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
      icon: "systems/dnd5e/icons/svg/item-grant.svg",
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
    // and any items that were skipped shouldn't be listed. This needs the ability to create links to items that are
    // embedded inside an actor.
    return this.data.configuration.items.reduce((html, uuid) => html + game.dnd5e.utils._linkForUuid(uuid), "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Locally apply this advancement to the actor.
   * @param {number} level              Level being advanced.
   * @param {object} data               Data from the advancement form.
   * @param {object} [retainedData={}]  Item data grouped by UUID. If present, this data will be used rather than
   *                                    fetching new data from the source.
   */
  async apply(level, data, retainedData={}) {
    const items = [];
    const updates = {};
    for ( const [uuid, selected] of Object.entries(data) ) {
      if ( !selected ) continue;
      const item = retainedData[uuid] ? new Item.implementation(retainedData[uuid]) : (await fromUuid(uuid))?.clone();
      if ( !item ) continue;
      item.data.update({
        _id: retainedData[uuid]?._id ?? foundry.utils.randomID(),
        "flags.dnd5e.sourceId": uuid,
        "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
      });
      items.push(item.toObject());
      // TODO: Trigger any additional advancement steps for added items
      updates[item.id] = uuid;
    }
    this.actor.data.update({items});
    this.updateSource({"value.added": updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  restore(level, data) {
    const updates = {};
    for ( const item of data.items ) {
      this.actor.data.update({items: [item]});
      // TODO: Restore any additional advancement data here
      updates[item._id] = item.flags.dnd5e.sourceId;
    }
    this.updateSource({"value.added": updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    const items = [];
    for ( const id of Object.keys(this.data.value.added ?? {}) ) {
      const item = this.actor.items.get(id);
      if ( item ) items.push(item.toObject());
      this.actor.items.delete(id);
      // TODO: Ensure any advancement data attached to these items is properly reversed
      // and store any advancement data for these items in case they need to be restored
    }
    this.updateSource({ "value.-=added": null });
    return { items };
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
      template: "systems/dnd5e/templates/advancement/item-grant-config.html",
      submitOnChange: true
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
    this.data.configuration.items.findSplice(uuid => uuid === uuidToDelete);
    this.render();
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

    const existingItems = this.data.configuration.items;

    // Abort if this uuid is the parent item
    if ( item.uuid === this.item.uuid ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.AdvancementItemGrantRecursiveWarning"));
    }

    // Abort if this uuid exists already
    if ( existingItems.includes(item.uuid) ) {
      return ui.notifications.warn(game.i18n.localize("DND5E.AdvancementItemGrantDuplicateWarning"));
    }

    this.data.configuration.items.push(item.uuid);
    this.render();
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
    const added = this.retainedData?.items.map(i => foundry.utils.getProperty(i, "flags.dnd5e.sourceId"))
      ?? this.advancement.data.value.added;
    const checked = new Set(Object.values(added ?? {}));

    return foundry.utils.mergeObject(super.getData(), {
      items: await Promise.all(config.map(async uuid => {
        const item = await fromUuid(uuid);
        item.checked = added ? checked.has(uuid) : true;
        return item;
      }))
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const retainedData = this.retainedData?.items.reduce((obj, i) => {
      obj[foundry.utils.getProperty(i, "flags.dnd5e.sourceId")] = i;
      return obj;
    }, {});
    await this.advancement.apply(this.level, formData, retainedData);
  }

}
