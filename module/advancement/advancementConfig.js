/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 *
 * @property {Advancement} advancement  The advancement item being edited.
 * @property {object} options           Additional options passed to FormApplication.
 * @extends {FormApplication}
 */
export class AdvancementConfig extends FormApplication {

  constructor(advancement, options={}) {
    super(advancement, options);

    /**
     * The advancement being created or edited.
     * @type {Advancement}
     */
    this.advancement = advancement;

    /**
     * Parent item to which this advancement belongs.
     * @type {Item5e}
     */
    this.parent = advancement.parent;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "dialog"],
      dragDrop: [{ dropSelector: ".drop-target" }],
      template: "systems/dnd5e/templates/advancement/advancement-config.html",
      width: 400,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const type = game.i18n.localize(this.advancement.constructor.defaultTitle);
    return `${game.i18n.format("DND5E.AdvancementConfigureTitle", { type })}: ${this.parent.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return {
      data: this.advancement.data,
      default: {
        title: game.i18n.localize(this.advancement.constructor.defaultTitle),
        icon: this.advancement.constructor.defaultIcon
      },
      levels: Object.fromEntries(this.advancement.constructor.allLevels.map(l => [l, l])),
      showClassRestrictions: this.parent.type === "class",
      showLevelSelector: !this.advancement.constructor.multiLevel
    };
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

    if (this.advancement.data.type === "ItemGrant") {
      return this._onDropItemGrantItem(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto the Advancement Config for ItemGrant
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<object>}    A data object which describes the result of the drop
   * @private
   */
  async _onDropItemGrantItem(event, data) {
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

  /**
   * Perform any changes to configuration data before it is saved to the advancement.
   * @param {object} configuration  Configuration object.
   * @returns {object}              Modified configuration.
   */
  prepareConfigurationUpdate(configuration) {
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    let updates = foundry.utils.expandObject(formData).data;
    if ( updates.configuration ) updates.configuration = this.prepareConfigurationUpdate(updates.configuration);

    return this._updateAdvancement(updates);
  }

  async _updateAdvancement(advancementUpdate) {
    const update = await this.advancement.update(advancementUpdate);

    this.render();
    return update;
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
      if ( value ) obj[key] = value;
      else obj[`-=${key}`] = null;
      return obj;
    }, {});
  }

}
