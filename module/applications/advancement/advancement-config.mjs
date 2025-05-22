/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 *
 * @param {Advancement} advancement            The advancement item being edited.
 * @param {object} [options={}]                Additional options passed to FormApplication.
 * @param {string} [options.dropKeyPath=null]  Path within advancement configuration where dropped items are stored.
 *                                             If populated, will enable default drop & delete behavior.
 */
export default class AdvancementConfig extends FormApplication {
  constructor(advancement, options={}) {
    super(advancement, options);
    this.#advancementId = advancement.id;
    this.item = advancement.item;
  }

  /* -------------------------------------------- */

  /**
   * The ID of the advancement being created or edited.
   * @type {string}
   */
  #advancementId;

  /* -------------------------------------------- */

  /**
   * Parent item to which this advancement belongs.
   * @type {Item5e}
   */
  item;

  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "dialog"],
      template: "systems/dnd5e/templates/advancement/advancement-config.hbs",
      width: 400,
      height: "auto",
      submitOnChange: true,
      closeOnSubmit: false,
      dropKeyPath: null
    });
  }

  /* -------------------------------------------- */

  /**
   * The advancement being created or edited.
   * @type {Advancement}
   */
  get advancement() {
    return this.item.advancement.byId[this.#advancementId];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    const type = this.advancement.constructor.metadata.title;
    return `${game.i18n.format("DND5E.AdvancementConfigureTitle", { item: this.item.name })}: ${type}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async close(options={}) {
    await super.close(options);
    delete this.advancement?.apps[this.appId];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const levels = Object.fromEntries(Array.fromRange(CONFIG.DND5E.maxLevel + 1).map(l => [l, l]));
    if ( ["class", "subclass"].includes(this.item.type) ) delete levels[0];
    else levels[0] = game.i18n.localize("DND5E.AdvancementLevelAnyHeader");
    const context = {
      appId: this.id,
      CONFIG: CONFIG.DND5E,
      ...this.advancement.toObject(false),
      src: this.advancement._source,
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
  activateListeners(html) {
    super.activateListeners(html);

    // Remove an item from the list
    if ( this.options.dropKeyPath ) html.on("click", "[data-action='delete']", this._onItemDelete.bind(this));

    for ( const element of html[0].querySelectorAll("multi-select") ) {
      element.addEventListener("change", this._onChangeInput.bind(this));
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  render(force=false, options={}) {
    this.advancement.apps[this.appId] = this;
    return super.render(force, options);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    let updates = foundry.utils.expandObject(formData);
    if ( updates.configuration ) updates.configuration = await this.prepareConfigurationUpdate(updates.configuration);
    await this.advancement.update(updates);
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
      if ( foundry.utils.getType(value) === "Object" ) {
        keep = Object.values(value).some(v => v);
      } else if ( value ) keep = true;
      if ( keep ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }

  /* -------------------------------------------- */
  /*  Drag & Drop for Item Pools                  */
  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Item entry from the Advancement.
   * @param {Event} event        The originating click event.
   * @returns {Promise<Item5e>}  The updated parent Item after the application re-renders.
   * @protected
   */
  async _onItemDelete(event) {
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
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

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
      ui.notifications.error("DND5E.ADVANCEMENT.ItemGrant.Warning.Recursive", {localize: true});
      return null;
    }

    // Abort if this uuid exists already
    if ( existingItems.find(i => i.uuid === item.uuid) ) {
      ui.notifications.warn("DND5E.ADVANCEMENT.ItemGrant.Warning.Duplicate", {localize: true});
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
