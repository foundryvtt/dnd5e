import PseudoDocumentSheet from "../api/pseudo-document-sheet.mjs";

/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 */
export default class AdvancementConfig extends PseudoDocumentSheet {
  constructor(advancement={}, options={}) {
    if ( advancement instanceof dnd5e.documents.advancement.Advancement ) {
      foundry.utils.logCompatibilityWarning(
        "`AdvancementConfig` should be constructed by passing the Advancement as `options.document`, not as separate parameter.",
        { since: "DnD5e 5.1", until: "DnD5e 5.3" }
      );
      options.document = advancement;
    } else options = { ...advancement, ...options };
    super(options);
  }

  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["advancement", "grid-columns"],
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
    else levels[0].label = game.i18n.localize("DND5E.ADVANCEMENT.Config.AnyLevel");
    const context = {
      ...(await super._prepareContext(options)),
      advancement: this.advancement,
      configuration: {
        data: this.advancement.configuration,
        fields: this.advancement.configuration?.schema?.fields
      },
      fields: this.advancement.schema.fields,
      source: this.advancement._source,
      default: {
        title: this.advancement._defaultTitle,
        icon: this.advancement._defaultIcon,
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
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new CONFIG.ux.DragDrop({
      dragSelector: ".draggable",
      dropSelector: null,
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Item entry from the Advancement.
   * @this {AdvancementConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteDroppedItem(event, target) {
    const uuidToDelete = target.closest("[data-item-uuid]")?.dataset.itemUuid;
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
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle beginning drag events on the sheet.
   * @param {DragEvent} event  The initiating drag start event.
   * @protected
   */
  async _onDragStart(event) {}

  /* -------------------------------------------- */

  /**
   * Handle dropping items onto the sheet.
   * @param {DragEvent} event  The concluding drag event.
   * @protected
   */
  async _onDrop(event) {
    if ( !this.options.dropKeyPath ) return;

    // Try to extract the data
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

    if ( data?.type !== "Item" ) return;
    const item = await Item.implementation.fromDropData(data);

    try {
      this._validateDroppedItem(event, item);
    } catch(err) {
      ui.notifications.error(err.message);
      return;
    }

    const existingItems = foundry.utils.getProperty(this.advancement.configuration, this.options.dropKeyPath);

    // Abort if this uuid is the parent item
    if ( item.uuid === this.item.uuid ) {
      ui.notifications.error("DND5E.ADVANCEMENT.ItemGrant.Warning.Recursive", {localize: true});
      return;
    }

    // Abort if this uuid exists already
    if ( existingItems.find(i => i.uuid === item.uuid) ) {
      ui.notifications.warn("DND5E.ADVANCEMENT.ItemGrant.Warning.Duplicate", {localize: true});
      return;
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
