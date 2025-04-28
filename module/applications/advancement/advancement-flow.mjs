/**
 * Base class for the advancement interface displayed by the advancement prompt that should be subclassed by
 * individual advancement types.
 *
 * @param {Item5e} item           Item to which the advancement belongs.
 * @param {string} advancementId  ID of the advancement this flow modifies.
 * @param {number} level          Level for which to configure this flow.
 * @param {object} [options={}]   Application rendering options.
 */
export default class AdvancementFlow extends FormApplication {
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

    /**
     * Data retained by the advancement manager during a reverse step. If restoring data using Advancement#restore,
     * this data should be used when displaying the flow's form.
     * @type {object|null}
     */
    this.retainedData = null;
  }

  /* -------------------------------------------- */

  /** @override */
  static _warnedAppV1 = true;

  /* --------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/advancement-flow.hbs",
      popOut: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _customElements = super._customElements.concat(["dnd5e-checkbox"]);

  /* -------------------------------------------- */

  /** @inheritDoc */
  get id() {
    return `actor-${this.advancement.item.id}-advancement-${this.advancement.id}-${this.level}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return this.advancement.title;
  }

  /* -------------------------------------------- */

  /**
   * The Advancement object this flow modifies.
   * @type {Advancement|null}
   */
  get advancement() {
    return this.item.advancement?.byId[this._advancementId] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Set the retained data for this flow. This method gives the flow a chance to do any additional prep
   * work required for the retained data before the application is rendered.
   * @param {object} data  Retained data associated with this flow.
   */
  async retainData(data) {
    this.retainedData = data;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    return {
      appId: this.id,
      advancement: this.advancement,
      type: this.advancement.constructor.typeName,
      title: this.title,
      hint: this.advancement.hint,
      summary: this.advancement.summaryForLevel(this.level),
      level: this.level
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _render(...args) {
    await super._render(...args);

    // Call setPosition on manager to adjust for size changes
    this.options.manager?.setPosition();
  }

  /* -------------------------------------------- */

  /**
   * Retrieve automatic application data from the advancement, if supported.
   * @returns {object|false}  Data to pass to the apply method, or `false` if advancement requirers user intervention.
   */
  getAutomaticApplicationValue() {
    return this.advancement.automaticApplicationValue(this.level);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _updateObject(event, formData) {
    await this.advancement.apply(this.level, formData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _canDragDrop(selector) {
    return true;
  }

}
