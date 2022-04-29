/**
 * A form for configuring actor hit points and bonuses.
 */
export default class ActorHitPointsConfig extends DocumentSheet {
  constructor(...args) {
    super(...args);

    /**
     * Cloned copy of the actor for previewing changes.
     * @type {Actor5e}
     */
    this.clone = this.object.clone();
  }

  /* -------------------------------------------- */

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "actor-hit-points-config"],
      template: "systems/dnd5e/templates/apps/hit-points-config.hbs",
      width: 320,
      height: "auto",
      sheetConfig: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.HitPointsConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    return {
      hp: this.clone.system.attributes.hp,
      isCharacter: this.document.type === "character"
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    const hp = foundry.utils.expandObject(formData).hp;
    return this.document.update({"system.attributes.hp": hp});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    const t = event.currentTarget;

    // Update clone with new data & re-render
    this.clone.updateSource({ [`system.attributes.${t.name}`]: t.value || null });
    this.render();
  }

}
