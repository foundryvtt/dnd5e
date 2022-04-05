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
      levels: Object.fromEntries(Array.numbersBetween(1, CONFIG.DND5E.maxLevel).map(l => [l, l])),
      showClassRestrictions: this.parent.type === "class",
      showLevelSelector: !this.advancement.constructor.multiLevel
    };
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

  /* -------------------------------------------- */

  /**
   * A helper to update the advancement and re-render this application with the adjusted advancement displayed.
   * @param {object} advancementUpdate  The update to the advancement data
   * @returns {Promise<Item5e>}    The promise for the updated Item which resolves after the application re-renders
   * @private
   */
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
