/**
 * A simple form to set actor hit dice amounts
 * @implements {DocumentSheet}
 */
export default class ActorHitDiceConfig extends DocumentSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "hd-config", "dialog"],
      template: "systems/dnd5e/templates/apps/hit-dice-config.html",
      width: 360,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("DND5E.HitDiceConfig")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    return {
      classes: this.object.items.reduce((classes, item) => {
        if (item.data.type === "class") {
          // Add the appropriate data only if this item is a "class"
          classes.push({
            classItemId: item.data._id,
            name: item.data.name,
            diceDenom: item.data.data.hitDice,
            currentHitDice: item.data.data.levels - item.data.data.hitDiceUsed,
            maxHitDice: item.data.data.levels,
            canRoll: (item.data.data.levels - item.data.data.hitDiceUsed) > 0
          });
        }
        return classes;
      }, []).sort((a, b) => parseInt(b.diceDenom.slice(1)) - parseInt(a.diceDenom.slice(1)))
    };
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Hook up -/+ buttons to adjust the current value in the form
    html.find("button.increment,button.decrement").click(event => {
      const button = event.currentTarget;
      const current = button.parentElement.querySelector(".current");
      const max = button.parentElement.querySelector(".max");
      const direction = button.classList.contains("increment") ? 1 : -1;
      current.value = Math.clamped(parseInt(current.value) + direction, 0, parseInt(max.value));
    });

    html.find("button.roll-hd").click(this._onRollHitDie.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const actorItems = this.object.items;
    const classUpdates = Object.entries(formData).map(([id, hd]) => ({
      _id: id,
      "data.hitDiceUsed": actorItems.get(id).data.data.levels - hd
    }));
    return this.object.updateEmbeddedDocuments("Item", classUpdates);
  }

  /* -------------------------------------------- */

  /**
   * Rolls the hit die corresponding with the class row containing the event's target button.
   * @param {MouseEvent} event
   * @private
   */
  async _onRollHitDie(event) {
    event.preventDefault();
    const button = event.currentTarget;
    await this.object.rollHitDie(button.dataset.hdDenom);

    // Re-render dialog to reflect changed hit dice quantities
    this.render();
  }
}
