import { AdvancementConfig } from "./advancement-config.js";
import { AdvancementFlow } from "./advancement-flow.js";


/**
 * Abstract base class which various advancement types can subclass.
 *
 * @property {Item5e} parent  Item to which this advancement belongs.
 * @property {object} [data]  Raw data stored in the advancement object.
 */
export class Advancement {

  constructor(parent, data={}) {
    /**
     * Item to which this advancement belongs.
     * @type {Item5e}
     */
    this.parent = parent;

    /**
     * Actor to which this advancement's item belongs, if the item is embedded.
     * @type {Actor5e|null}
     */
    this.actor = parent.parent ?? null;

    /**
     * Configuration data for this advancement.
     * @type {object}
     */
    this.data = data;
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /**
   * Name of this advancement type that will be stored in config and used for lookups.
   * @type {string}
   * @protected
   */
  static get typeName() {
    return this.name.replace(/Advancement$/, "");
  }

  /* -------------------------------------------- */

  /**
   * Data structure for a newly created advancement of this type.
   * @type {object}
   * @protected
   */
  static get defaultData() {
    const data = {
      _id: null,
      type: this.typeName,
      configuration: foundry.utils.deepClone(this.defaultConfiguration),
      value: foundry.utils.deepClone(this.defaultValue)
    };
    if ( !this.multiLevel ) data.level = 1;
    return data;
  }

  /* -------------------------------------------- */

  /**
   * Default contents of the configuration object for an advancement of this type.
   * @type {object}
   */
  static defaultConfiguration = {};

  /* -------------------------------------------- */

  /**
   * Default contents of the actor value object for an advancement of this type.
   * @type {object}
   */
  static defaultValue = {};

  /* -------------------------------------------- */

  /**
   * Number used to determine default sorting order of advancement items.
   * @type {number}
   */
  static order = 100;

  /* -------------------------------------------- */

  /**
   * Localization key for the title to be displayed if no user title is specified.
   * @type {string}
   */
  static defaultTitle = "DND5E.AdvancementTitle";

  /* -------------------------------------------- */

  /**
   * Icon used for this advancement type if no user icon is specified.
   * @type {string}
   */
  static defaultIcon = "icons/svg/upgrade.svg";

  /* -------------------------------------------- */

  /**
   * Localization key for a description of this advancement type shown in the advancement selection interface.
   * @type {string}
   */
  static hint = "";

  /* -------------------------------------------- */

  /**
   * Subclass of AdvancementConfig that allows for editing of this advancement type.
   */
  static configApp = AdvancementConfig;

  /* -------------------------------------------- */

  /**
   * Subclass of AdvancementFlow that is displayed while fulfilling this advancement.
   */
  static flowApp = AdvancementFlow;

  /* -------------------------------------------- */

  /**
   * Can this advancement affect more than one level. If this is set to true, the level selection control
   * in the configuration window is hidden and the advancement should provide its own implementation of
   * `Advancement#levels` and potentially its own level configuration interface.
   * @type {boolean}
   */
  static multiLevel = false;

  /* -------------------------------------------- */

  /**
   * Create an array of levels between 1 and the maximum allowed level.
   * @type {number[]}
   * @protected
   */
  static get allLevels() {
    return Array.from({length: CONFIG.DND5E.maxLevel}, (v, i) => i + 1);
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Unique identifier for this advancement.
   * @type {string}
   */
  get id() {
    return this.data._id;
  }

  /* -------------------------------------------- */

  /**
   * Title of this advancement object when level isn't relevant.
   * @type {string}
   */
  get title() {
    return this.data.title || game.i18n.localize(this.constructor.defaultTitle);
  }

  /* -------------------------------------------- */

  /**
   * Icon to display in advancement list.
   * @type {string}
   */
  get icon() {
    return this.data.icon || this.constructor.defaultIcon;
  }

  /* -------------------------------------------- */

  /**
   * List of levels in which this advancement object should be displayed. Will be a list of class levels if this
   * advancement is being applied to classes or subclasses, otherwise a list of character levels.
   * @returns {number[]}
   */
  get levels() {
    return this.data.level ? [this.data.level] : [];
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /**
   * Has the player made choices for this advancement at the specified level?
   * @param {number} level  Level for which to check configuration.
   * @returns {boolean}     Have any available choices been made?
   */
  configuredForLevel(level) {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Value used for sorting this advancement at a certain level.
   * @param {number} level  Level for which this entry is being sorted.
   * @returns {string}      String that can be used for sorting.
   */
  sortingValueForLevel(level) {
    return `${this.constructor.order.paddedString(4)} ${this.titleForLevel(level)}`;
  }

  /* -------------------------------------------- */

  /**
   * Title displayed in advancement list for a specific level.
   * @param {number} level  Level for which to generate a title.
   * @returns {string}      HTML title with any level-specific information.
   */
  titleForLevel(level) {
    return this.title;
  }

  /* -------------------------------------------- */

  /**
   * Summary content displayed beneath the title in the advancement list.
   * @param {number} level  Level for which to generate the summary.
   * @returns {string}      HTML content of the summary.
   */
  summaryForLevel(level) {
    return "";
  }

  /* -------------------------------------------- */
  /*  Editing Methods                             */
  /* -------------------------------------------- */

  /**
   * Update this advancement.
   * @param {object} updates          Updates to apply to this advancement, using the same format as `Document#update`.
   * @returns {Promise<Advancement>}  This advancement after updates have been applied.
   */
  async update(updates) {
    await this.parent.updateAdvancement(this.id, updates);
    this.data = this.parent.advancement[this.id].data;
    return this.parent.advancement[this.id];
  }

  /* -------------------------------------------- */

  /**
   * Update this advancement's data on the item without performing a database commit.
   * @param {object} updates  Updates to apply to this advancement, using the same format as `Document#update`.
   * @returns {Advancement}   This advancement after updates have been applied.
   */
  updateSource(updates) {
    const item = this.actor.items.get(this.parent.id);
    const idx = item.data.data.advancement.findIndex(a => a._id === this.id);
    if ( idx === -1 ) throw new Error(`Advancement of ID ${this.id} could not be found to update`);

    const advancement = foundry.utils.deepClone(item.data.data.advancement);
    foundry.utils.mergeObject(this.data, updates);
    foundry.utils.mergeObject(advancement[idx], updates);
    item.data.update({"data.advancement": advancement});

    return this;
  }

  /* -------------------------------------------- */

  /**
   * Can an advancement of this type be added to the provided item.
   * @param {Item5e} item  Item to check against.
   * @returns {boolean}    Can this be added?
   */
  static availableForItem(item) {
    return true;
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Add any properties that should be changed on the actor to an update object.
   * @param {object} config
   * @param {number} config.level             Level for which to gather updates.
   * @param {object} [config.updates]         Updates to this advancement's `value`. If this is provided, only the
   *                                          difference between this object and the existing value should be applied.
   * @param {boolean} [config.reverse=false]  Whether the reverse changes should be produced.
   * @returns {object}                        The actor updates object.
   */
  propertyUpdates({ level, updates, reverse=false }) {
    return {};
  }

  /* -------------------------------------------- */

  /**
   * Get a list UUIDs for new items that should be added to the actor.
   * @param {object} config
   * @param {number} config.level             Level for which to add items.
   * @param {object} [config.updates]         Updates to this advancement's `value`. If this is provided, only the
   *                                          difference between this object and the existing value should be applied.
   * @param {boolean} [config.reverse=false]  Whether the reverse changes should be produced.
   * @returns {{
   *   add: string[],
   *   remove: string[]
   * }}  UUIDs of items to add to the actor and IDs of items to remove.
   */
  itemUpdates({ level, updates, reverse=false }) {
    return { add: [], remove: [] };
  }

}
