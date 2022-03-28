/**
 * Base configuration application for advancements that can be extended by other types to implement custom
 * editing interfaces.
 *
 * @property {Advancement} advancement             The advancement item being edited.
 * @property {object} [options={}]                 Additional options passed to FormApplication.
 * @property {boolean} [options.dynamicInterface]  Re-render the UI after any changes to form data.
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
     * Copy of the advancement data used for the dynamic interface.
     */
    this.data = foundry.utils.deepClone(this.advancement.data);

    /**
     * Parent item to which this advancement belongs.
     * @type {Item5e}
     */
    this.item = advancement.item;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "dialog"],
      template: "systems/dnd5e/templates/advancement/advancement-config.html",
      width: 400,
      height: "auto",
      dynamicInterface: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const type = this.advancement.constructor.metadata.title;
    return `${game.i18n.format("DND5E.AdvancementConfigureTitle", { type })}: ${this.item.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const levels = Object.fromEntries(Array.fromRange(CONFIG.DND5E.maxLevel + 1).map(l => [l, l]));
    if ( ["class", "subclass"].includes(this.item.type) ) delete levels[0];
    else levels[0] = game.i18n.localize("DND5E.AdvancementLevelAnyHeader");

    return {
      data: this.data,
      default: {
        title: this.advancement.constructor.metadata.title,
        icon: this.advancement.constructor.metadata.icon
      },
      levels,
      showClassRestrictions: this.item.type === "class",
      showLevelSelector: !this.advancement.constructor.metadata.multiLevel
    };
  }

  /* -------------------------------------------- */

  /**
   * Re-render the page after a very brief delay to prevent focus from being lost.
   * @param {number} [delay=10]  How many milliseconds to wait before calling render.
   * @returns {Promise}          Promise that will be resolved once render is called.
   */
  async delayedRender(delay=10, ...args) {
    return new Promise((resolve, reject) => setTimeout(resolve, delay)).then(() => this.render(...args));
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
    if ( this.options.dynamicInterface ) foundry.utils.mergeObject(updates, this.data);
    if ( updates.configuration ) updates.configuration = this.prepareConfigurationUpdate(updates.configuration);

    return this.advancement.update(updates);
  }

  /* -------------------------------------------- */

  /**
   * Helper method used to update the internal data object when `options.dynamicInterface` is true.
   * @params {object} [updateData={}]  Additional object updates applied to the data.
   */
  _updateInternalData(updateData={}) {
    const formData = this._getSubmitData(updateData);
    const updates = foundry.utils.expandObject(formData).data;
    if ( updates.configuration ) updates.configuration = this.prepareConfigurationUpdate(updates.configuration);
    foundry.utils.mergeObject(this.data, updates);
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

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);

    if ( this.options.dynamicInterface ) {
      this._updateInternalData();
      this.delayedRender();
    }
  }

}
