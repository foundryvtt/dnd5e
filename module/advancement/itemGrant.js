import { Advancement } from "./advancement.js";
import { AdvancementConfig } from "./advancementConfig.js";

/**
 * Configuration application for item grants.
 *
 * @extends {AdvancementConfig}
 */
export class ItemGrantConfig extends AdvancementConfig {
  /* -------------------------------------------- */

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
    html.on("click", ".item-delete", event => {
      const parentElement = $(event.currentTarget).parents("[data-item-uuid]");
      const uuidToDelete = parentElement.data("itemUuid");

      const updates = {
        configuration: this.prepareConfigurationUpdate({
          items: this.advancement.data.configuration.items.filter(uuid => uuid !== uuidToDelete)
        })
      };

      return this._updateAdvancement(updates);
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const data = super.getData();
    data.classIdentifier = this.parent.identifier;

    let lastValue = "";
    data.levels = this.advancement.constructor.allLevels.reduce((obj, level) => {
      obj[level] = { placeholder: lastValue, value: "" };
      const value = this.data.configuration.scale[level];
      if ( value && (value !== lastValue) ) {
        obj[level].value = value;
        lastValue = value;
      }
      return obj;
    }, {});

    return data;
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

    if (data.type !== "Item") return false;
    const item = await Item.implementation.fromDropData(data);

    const existingItems = this.advancement.data.configuration.items;

    // Abort if this uuid exists already
    if (existingItems.includes(item.uuid)) {
      ui.notifications.warn(game.i18n.localize("DND5E.AdvancementItemGrantDuplicateWarning"));

      return false;
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

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareConfigurationUpdate(configuration) {
    configuration.scale = this.constructor._cleanedObject(configuration.scale);
    return configuration;
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

  /**
   * Subclass of AdvancementConfig that allows for editing of this advancement type.
   */
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
