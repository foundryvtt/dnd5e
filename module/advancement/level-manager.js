/**
 *
 */
export class LevelManager extends FormApplication {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "level-manager"],
      template: "systems/dnd5e/templates/advancement/level-manager.html",
      title: "Level Manager",
      width: 400,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get id() {
    return `actor-${this.object.id}-level-manager`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const classes = this.object.itemTypes.class.sort((a, b) => a.name.localeCompare(b.name));
    return foundry.utils.mergeObject(super.getData(), {
      classes
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    
  }

}
