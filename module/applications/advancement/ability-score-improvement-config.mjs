import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for ability score improvements.
 */
export default class AbilityScoreImprovementConfig extends AdvancementConfig {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData() {
    const abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [key, data]) => {
      const fixed = this.advancement.configuration.fixed[key] ?? 0;
      obj[key] = {
        key,
        name: `configuration.fixed.${key}`,
        label: data.label,
        value: fixed,
        canIncrease: true,
        canDecrease: true
      };
      return obj;
    }, {});

    return foundry.utils.mergeObject(super.getData(), {
      abilities,
      points: {
        key: "points",
        name: "configuration.points",
        label: game.i18n.localize("DND5E.AdvancementAbilityScoreImprovementPoints"),
        min: 0,
        value: this.advancement.configuration.points,
        canIncrease: true,
        canDecrease: this.advancement.configuration.points > 0
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".adjustment-button").click(this._onClickButton.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the plus and minus buttons.
   * @param {Event} event  Triggering click event.
   */
  _onClickButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const input = event.currentTarget.closest("li").querySelector("input");

    if ( action === "decrease" ) input.valueAsNumber -= 1;
    else if ( action === "increase" ) input.valueAsNumber += 1;

    this.submit();
  }
}
