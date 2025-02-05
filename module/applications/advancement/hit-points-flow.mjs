import AdvancementFlow from "./advancement-flow.mjs";
import Advancement from "../../documents/advancement/advancement.mjs";

/**
 * Inline application that presents hit points selection upon level up.
 */
export default class HitPointsFlow extends AdvancementFlow {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/hit-points-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    const source = this.retainedData ?? this.advancement.value;
    const value = source[this.level];

    // If value is empty, `useAverage` should default to the value selected at the previous level
    let useAverage = value === "avg";
    if ( !value ) {
      const lastValue = source[this.level - 1];
      if ( lastValue === "avg" ) useAverage = true;
    }

    return foundry.utils.mergeObject(super.getData(), {
      isFirstClassLevel: (this.level === 1) && this.advancement.item.isOriginalClass,
      hitDie: this.advancement.hitDie,
      dieValue: this.advancement.hitDieValue,
      data: {
        value: Number.isInteger(value) ? value : "",
        useAverage
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    this.form.querySelector(".average-checkbox")?.addEventListener("change", event => {
      this.form.querySelector(".roll-result").disabled = event.target.checked;
      this.form.querySelector(".roll-button").disabled = event.target.checked;
      this._updateRollResult();
    });
    this.form.querySelector(".roll-button")?.addEventListener("click", async () => {
      const roll = await this.advancement.actor.rollClassHitPoints(this.advancement.item);
      this.form.querySelector(".roll-result").value = roll.total;
    });
    this._updateRollResult();
  }

  /* -------------------------------------------- */

  /**
   * Update the roll result display when the average result is taken.
   * @protected
   */
  _updateRollResult() {
    if ( !this.form.elements.useAverage?.checked ) return;
    this.form.elements.value.value = (this.advancement.hitDieValue / 2) + 1;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _updateObject(event, formData) {
    let value;
    if ( formData.useMax ) value = "max";
    else if ( formData.useAverage ) value = "avg";
    else if ( Number.isInteger(formData.value) ) value = parseInt(formData.value);

    if ( value !== undefined ) return this.advancement.apply(this.level, { [this.level]: value });

    this.form.querySelector(".rollResult")?.classList.add("error");
    const errorType = formData.value ? "Invalid" : "Empty";
    throw new Advancement.ERROR(game.i18n.localize(`DND5E.ADVANCEMENT.HitPoints.Warning.${errorType}`));
  }

}
