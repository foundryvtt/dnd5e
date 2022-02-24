import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancementConfig.js";

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
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return !foundry.utils.isObjectEmpty(this.data.value);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level) {
    return this.data.configuration.items.reduce((html, uuid) => html + game.dnd5e.utils._linkForUuid(uuid), "");
  }
}
