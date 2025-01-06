import Advancement from "../../documents/advancement/advancement.mjs";
import PseudoDocumentSheet from "../api/pseudo-document-sheet.mjs";

/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 */
export default class AdvancementConfig extends PseudoDocumentSheet {
  constructor(advancement={}, options={}) {
    if ( advancement instanceof Advancement ) {
      options.document = advancement;
      // TODO: Add deprecation warning for this calling pattern once system has switched over to using the sheet
      // getter on Advancement, rather than creating separately
    } else options = { ...advancement, ...options };
    super(options);
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["advancement"],
    window: {
      icon: "fa-solid fa-person-rays"
    },
    actions: {
      deleteItem: AdvancementConfig.#deleteDroppedItem
    },
    dropKeyPath: null,
    position: {
      width: 400
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/advancement/advancement-controls-section.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * The advancement being created or edited.
   * @type {Advancement}
   */
  get advancement() {
    return this.document;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return this.advancement.constructor.metadata.title;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const levels = Array.fromRange(CONFIG.DND5E.maxLevel + 1).map(l => ({ value: l, label: l }));
    if ( ["class", "subclass"].includes(this.item.type) ) delete levels[0];
    else levels[0].label = game.i18n.localize("DND5E.AdvancementLevelAnyHeader");
    const context = {
      ...(await super._prepareContext(options)),
      advancement: this.advancement,
      configuration: this.advancement.configuration,
      source: this.advancement._source,
      default: {
        title: this.advancement.constructor.metadata.title,
        icon: this.advancement.constructor.metadata.icon,
        hint: ""
      },
      levels,
      classRestrictionOptions: [
        { value: "", label: game.i18n.localize("DND5E.AdvancementClassRestrictionNone") },
        { value: "primary", label: game.i18n.localize("DND5E.AdvancementClassRestrictionPrimary") },
        { value: "secondary", label: game.i18n.localize("DND5E.AdvancementClassRestrictionSecondary") }
      ],
      showClassRestrictions: this.item.type === "class",
      showLevelSelector: !this.advancement.constructor.metadata.multiLevel
    };
    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Item entry from the Advancement.
   * @param {Event} event        The originating click event.
   * @returns {Promise<Item5e>}  The updated parent Item after the application re-renders.
   * @this {AdvancementConfig}
   */
  static async #deleteDroppedItem(event) {
    event.preventDefault();
    const uuidToDelete = event.currentTarget.closest("[data-item-uuid]")?.dataset.itemUuid;
    if ( !uuidToDelete ) return;
    const items = foundry.utils.getProperty(this.advancement.configuration, this.options.dropKeyPath);
    const updates = { configuration: await this.prepareConfigurationUpdate({
      [this.options.dropKeyPath]: items.filter(i => i.uuid !== uuidToDelete)
    }) };
    await this.advancement.update(updates);
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /**
   * Perform any changes to configuration data before it is saved to the advancement.
   * @param {object} configuration  Configuration object.
   * @returns {object}              Modified configuration.
   */
  async prepareConfigurationUpdate(configuration) {
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _processSubmitData(event, submitData) {
    submitData.configuration ??= {};
    submitData.configuration = await this.prepareConfigurationUpdate(submitData.configuration);
    await this.advancement.update(submitData);
  }

  /* -------------------------------------------- */

  /**
   * Helper method to take an object and apply updates that remove any empty keys.
   * @param {object} object  Object to be cleaned.
   * @returns {object}       Copy of object with only non false-ish values included and others marked
   *                         using `-=` syntax to be removed by update process.
   * @protected
   */
  static _cleanedObject(object) {
    return Object.entries(object).reduce((obj, [key, value]) => {
      let keep = false;
      if ( foundry.utils.getType(value) === "Object" ) keep = Object.values(value).some(v => v);
      else if ( value ) keep = true;
      if ( keep ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Drag & Drop for Item Pools                  */
  /* -------------------------------------------- */

  // TODO: Re-implement drag & drop for ApplicationV2

  /** @inheritDoc */
  _canDragDrop() {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    if ( !this.options.dropKeyPath ) throw new Error(
      "AdvancementConfig#options.dropKeyPath must be configured or #_onDrop must be overridden to support"
      + " drag and drop on advancement config items."
    );

    // Try to extract the data
    const data = TextEditor.getDragEventData(event);

    if ( data?.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    try {
      this._validateDroppedItem(event, item);
    } catch(err) {
      ui.notifications.error(err.message);
      return null;
    }

    const existingItems = foundry.utils.getProperty(this.advancement.configuration, this.options.dropKeyPath);

    // Abort if this uuid is the parent item
    if ( item.uuid === this.item.uuid ) {
      ui.notifications.error("DND5E.AdvancementItemGrantRecursiveWarning", {localize: true});
      return null;
    }

    // Abort if this uuid exists already
    if ( existingItems.find(i => i.uuid === item.uuid) ) {
      ui.notifications.warn("DND5E.AdvancementItemGrantDuplicateWarning", {localize: true});
      return null;
    }

    await this.advancement.update({[`configuration.${this.options.dropKeyPath}`]: [
      ...existingItems, { uuid: item.uuid }
    ]});
  }

  /* -------------------------------------------- */

  /**
   * Called when an item is dropped to validate the Item before it is saved. An error should be thrown
   * if the item is invalid.
   * @param {Event} event  Triggering drop event.
   * @param {Item5e} item  The materialized Item that was dropped.
   * @throws An error if the item is invalid.
   * @protected
   */
  _validateDroppedItem(event, item) {}
}
