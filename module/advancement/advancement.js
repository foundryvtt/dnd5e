/**
 * Abstract base class which various advancement types can subclass.
 *
 * @property {Item5e} item    Item to which this advancement belongs.
 * @property {object} [data]  Raw data stored in the advancement object.
 */
export class Advancement {

  constructor(item, data={}) {
    /**
     * Item to which this advancement belongs.
     * @type {Item5e}
     */
    this.item = item;

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
   * Title displayed in advancement list for a specific level.
   * @param {number} level  Level for which to generate a title.
   * @returns {string}      Title with any level-specific information.
   */
  titleForLevel(level) {
    return this.title;
  }

}
