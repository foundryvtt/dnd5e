/**
 * Interface for managing a character's armor calculation.
 *
 * @extends {DocumentSheet}
 */
export default class ActorArmorConfig extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "actor-armor-config",
      classes: ["dnd5e", "actor-armor-config"],
      template: "systems/dnd5e/templates/apps/actor-armor.html",
      width: 320,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.ArmorConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    return {
      ac: foundry.utils.getProperty(this.object.data, "data.attributes.ac"),
      preview: this.object._computeArmorClass(this.object.data.data, { ignoreFlat: true })
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    let data = foundry.utils.expandObject(formData).ac;
    return this.object.update({"data.attributes.ac": data});
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);
    this.form["ac.flat"].placeholder = this.object._computeArmorClass(this.object.data.data, { ignoreFlat: true });
  }
}
