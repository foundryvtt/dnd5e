/**
 * Base class for the advancement interface displayed by the advancement prompt that should be subclassed by
 * individual advancement types.
 *
 * @property {Item5e} item           Item to which the advancement belongs.
 * @property {string} advancementId  ID of the advancement this flow modifies.
 * @property {number} level          Level for which to configure this flow.
 * @extends {FormApplication}
 */
export class AdvancementFlow extends FormApplication {

  constructor(item, advancementId, level, options={}) {
    super({}, options);

    /**
     * The item that houses the Advancement.
     * @type {Item5e}
     */
    this.item = item;

    /**
     * ID of the advancement this flow modifies.
     * @type {string}
     * @private
     */
    this._advancementId = advancementId;

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
      template: "systems/dnd5e/templates/advancement/advancement-flow.html",
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
   * The Advancement object this flow modifies.
   * @type {Advancement|null}
   */
  get advancement() {
    return this.item.advancement?.[this._advancementId] ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    return {
      appId: this.id,
      advancement: this.advancement,
      type: this.advancement.constructor.typeName,
      title: this.title,
      summary: this.advancement.summaryForLevel(this.level),
      level: this.level
    };
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
