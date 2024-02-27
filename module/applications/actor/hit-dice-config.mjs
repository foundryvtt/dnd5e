import BaseConfigSheet from "./base-config.mjs";

/**
 * A simple form to set actor hit dice amounts.
 */
export default class ActorHitDiceConfig extends BaseConfigSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "hd-config", "dialog"],
      template: "systems/dnd5e/templates/apps/hit-dice-config.hbs",
      width: 360,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.HitDiceConfig")}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options) {
    return {
      classes: this.object.items.reduce((classes, item) => {
        if (item.type === "class") {
          classes.push({
            classItemId: item.id,
            name: item.name,
            diceDenom: item.system.hitDice,
            currentHitDice: item.system.levels - item.system.hitDiceUsed,
            maxHitDice: item.system.levels,
            canRoll: (item.system.levels - item.system.hitDiceUsed) > 0
          });
        }
        return classes;
      }, []).sort((a, b) => parseInt(b.diceDenom.slice(1)) - parseInt(a.diceDenom.slice(1)))
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
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

  /** @inheritDoc */
  async _updateObject(event, formData) {
    const actorItems = this.object.items;
    const classUpdates = Object.entries(formData).map(([id, hd]) => ({
      _id: id,
      "system.hitDiceUsed": actorItems.get(id).system.levels - hd
    }));
    return this.object.updateEmbeddedDocuments("Item", classUpdates);
  }

  /* -------------------------------------------- */

  /**
   * Rolls the hit die corresponding with the class row containing the event's target button.
   * @param {MouseEvent} event  Triggering click event.
   * @protected
   */
  async _onRollHitDie(event) {
    event.preventDefault();
    const button = event.currentTarget;
    await this.object.rollHitDie({ denomination: button.dataset.hdDenom });

    // Re-render dialog to reflect changed hit dice quantities
    this.render();
  }
}
