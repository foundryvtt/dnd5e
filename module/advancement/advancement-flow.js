/**
 * Base class for the advancement interface displayed by the advancement manager that should be subclassed by
 * individual advancement types.
 *
 * @property {Advancement} advancement  Advancement to which this flow belongs.
 * @property {number} level             Level for which to configure this flow.
 * @extends {FormApplication}
 */
export class AdvancementFlow extends FormApplication {

  constructor(advancement, level, options={}) {
    super(options);

    /**
     * Advancement to which this flow belongs.
     * @type {Advancement}
     */
    this.advancement = advancement;

    /**
     * Level for which to configure this flow.
     * @type {number}
     */
    this.level = level;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      popOut: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-${this.advancement.parent.id}-advancement-${this.advancement.id}-${this.level}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return this.advancement.title;
  }

  /* -------------------------------------------- */

  /**
   * Sorting value used for ordering this flow within the advancement manager.
   * @type {string}
   */
  get sortingValue() {
    return this.advancement.sortingValueForLevel(this.level);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return { advancement: this.advancement, title: this.title, level: this.level };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _replaceHTML(element, html) {
    Object.entries(element[0].dataset).forEach(([k, v]) => html[0].dataset[k] = v);
    super._replaceHTML(element, html);
  }

  /* -------------------------------------------- */

  /**
   * Perform any steps to prepare the form data to be saved within advancement values.
   * @param {object} formData  Data object taken from the form.
   * @returns {object}         Data formatted to be applied as an update to `Advancement#data.value`.
   */
  prepareUpdate(formData) {
    return formData;
  }

  /* -------------------------------------------- */

  /**
   * Perform any final transformation necessary on the value updates after items have been added.
   * @param {object} update        Value update data provided by `AdvancementFlow#prepareUpdate`.
   * @param {Item5e[]} itemsAdded  Any items added to the actor.
   * @returns {object}             Final value updates to apply to the advancement.
   */
  finalizeUpdate(update, itemsAdded) {
    return update;
  }

  /* -------------------------------------------- */

  /**
   * Provide the update data needed to remove stored value data for this level.
   * @returns {object}  Update object to remove any stored value.
   */
  reverseUpdate() {
    return {};
  }

}


/**
 * Error that can be thrown during the advancement update preparation process.
 *
 * @extends {Error}
 */
export class AdvancementError extends Error {

  constructor(...args) {
    super(...args);

    this.name = "AdvancementError";
  }

}
