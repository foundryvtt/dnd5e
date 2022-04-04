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

  async apply(event, actor, formData) {
    await this.advancement.apply(actor, this.level, foundry.utils.expandObject(formData));
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
