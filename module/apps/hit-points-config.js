/**
 * A form for configuring actor hit points and bonuses.
 * @implements {DocumentSheet}
 */
export default class ActorHitPointsConfig extends FormApplication {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "hp-config", "dialog"],
      template: "systems/dnd5e/templates/apps/hit-points-config.html",
      width: 320,
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
      data: this.object.data.data.attributes.hp,
      isCharacter: this.object.type === "character",
      preview: this.object._computeHitPoints(this.object)
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-hit-points").click(this._onRollHPFormula.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    super._onChangeInput(event);

    if ( this.object.type === "character" ) {
      const formData = foundry.utils.expandObject(this._getSubmitData());
      const preview = this.object._computeHitPoints(this.object, foundry.utils.mergeObject(
        this.object.data.data.attributes.hp, formData.data.attributes.hp, {inplace: false}
      ));
      this.form.querySelector("input[name='data.attributes.hp.override']").placeholder = preview;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    this.object.update(formData);
    // TODO: Update HP value using HP max delta
  }

  /* -------------------------------------------- */

  /**
   * Handle rolling NPC health values using the provided formula.
   * @param {Event} event  The original click event.
   * @private
   */
  async _onRollHPFormula(event) {
    event.preventDefault();
    const formula = this.form.querySelector("input[name='data.attributes.hp.formula']").value;
    if ( !formula ) return;
    try {
      const roll = await this.object.rollNPCHitPoints(formula);
      this.form.querySelector("input[name='data.attributes.hp.max']").value = roll.total;
    } catch(error) {
      ui.notifications.error(game.i18n.localize("DND5E.HPFormulaError"));
      throw error;
    }
  }

}
