import { BaseConfig } from "./baseConfig.js";

/**
 * Abstract base class which various advancement types can subclass.
 *
 * @property {Item5e} parent  Item to which this advancement belongs.
 * @property {object} [data]  Raw data stored in the advancement object.
 */
export class BaseAdvancement {

  constructor(parent, data={}) {
    /**
     * Item to which this advancement belongs.
     * @type {Item5e}
     */
    this.parent = parent;

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
   * Subclass of BaseConfig that allows for editing of this advancement type.
   */
  static configApp = BaseConfig;

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Title of this advancement object when level isn't relevant.
   * @type {string}
   */
  get title() {
    return this.data.title ?? game.i18n.localize(this.constructor.defaultTitle);
  }

  /* -------------------------------------------- */

  /**
   * Icon to display in advancement list.
   * @type {string}
   */
  get icon() {
    return this.data.icon ?? this.constructor.defaultIcon;
  }

  /* -------------------------------------------- */

  /**
   * List of levels in which this advancement object should be displayed. Will be a list of class levels if this
   * advancement is being applied to classes or subclasses, otherwise a list of character levels.
   * @returns {number[]}
   */
  get levels() {
    return this.data.levels ?? (this.data.level ? [this.data.level] : []);
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
   * Can an advancement of this type be added to the provided item.
   * @param {Item5e} item  Item to check against.
   * @returns {boolean}    Can this be added?
   */
  static availableForItem(item) {
    return true;
  }

}
