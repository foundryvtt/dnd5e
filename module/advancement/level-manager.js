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
    const characterLevel = classes.reduce((lvl, cls) => lvl + cls.data.data.levels, 0);
    return foundry.utils.mergeObject(super.getData(), {
      classes,
      characterLevel,
      isMaxLevel: characterLevel >= CONFIG.DND5E.maxLevel
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("button:is(.add, .subtract)").forEach(e => {
      e.addEventListener("click", this._onClickAddSubtractButton.bind(this));
    });
  }

  /* -------------------------------------------- */

  /**
   * Update value of level field on button clicks, capping to min and max levels.
   * @param {Event} event  Click event for the change.
   */
  _onClickAddSubtractButton(event) {
    event.preventDefault();
    const form = event.target.closest("form");
    const characterLevel = Number(form.dataset.characterLevel);
    const field = event.target.closest("div").querySelector("input.levels");

    if ( event.currentTarget.classList.contains("add") && (characterLevel + 1 <= CONFIG.DND5E.maxLevel) ) {
      field.value++;
      form.dataset.characterLevel = characterLevel + 1;
    } else if ( event.currentTarget.classList.contains("subtract") && (field.value > 0) ) {
      field.value--;
      form.dataset.characterLevel = characterLevel - 1;
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    // Figure out level deltas for all classes
    const levelDeltas = Object.entries(formData).map(([identifier, level]) => {
      const cls = this.object.classes[identifier];
      const delta = level - cls.data.data.levels;
      return [cls, delta];
    }).filter(([, delta]) => delta !== 0).sort((a, b) => a[1] - b[1]);

    // Create advancement manager and trigger changes
    console.log(levelDeltas);
  }

}
