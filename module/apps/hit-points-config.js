/**
 * A form for configuring actor hit points and bonuses.
 * @implements {DocumentSheet}
 */
export default class ActorHitPointsConfig extends FormApplication {

  constructor(object, options) {
    super(object, options);

    /**
     * Copy of the HP data for display.
     * @type {object}
     */
    this.hpData = foundry.utils.deepClone(object.data.data.attributes.hp);
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "hp-config", "dialog"],
      template: "systems/dnd5e/templates/apps/hit-points-config.html",
      width: 360,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-${this.object.id}-hit-points-config`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.HitPointsConfig")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    return {
      data: this.hpData,
      isCharacter: this.object.type === "character",
      preview: this.object._computeHitPoints(this.object, this.hpData, this.object.getRollData())
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    super._onChangeInput(event);

    const formData = foundry.utils.expandObject(this._getSubmitData());
    foundry.utils.mergeObject(this.hpData, formData.data.attributes.hp);
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    this.object.update(formData);
  }

}
