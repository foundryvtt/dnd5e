import AdvancementConfig from "./advancement-config-v2.mjs";

/**
 * Configuration application for ability score improvements.
 */
export default class AbilityScoreImprovementConfig extends AdvancementConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ability-score-improvement"],
    actions: {
      decrease: AbilityScoreImprovementConfig.#adjustValue,
      increase: AbilityScoreImprovementConfig.#adjustValue,
      lock: AbilityScoreImprovementConfig.#lockValue
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    details: {
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-config-details.hbs"
    },
    scores: {
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-config-scores.hbs",
      templates: ["systems/dnd5e/templates/advancement/parts/advancement-ability-score-control-v2.hbs"]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [key, data]) => {
      if ( !this.advancement.canImprove(key) ) return obj;
      const fixed = this.advancement.configuration.fixed[key] ?? 0;
      const locked = this.advancement.configuration.locked.has(key);
      obj[key] = {
        key,
        name: `configuration.fixed.${key}`,
        label: data.label,
        locked: {
          value: locked,
          hint: `DND5E.ADVANCEMENT.AbilityScoreImprovement.FIELDS.locked.${locked ? "locked" : "unlocked"}`
        },
        value: fixed,
        canIncrease: true,
        canDecrease: true
      };
      return obj;
    }, {});

    context.points = {
      key: "points",
      name: "configuration.points",
      label: game.i18n.localize("DND5E.ADVANCEMENT.AbilityScoreImprovement.FIELDS.points.label"),
      min: 0,
      value: this.advancement.configuration.points,
      canIncrease: true,
      canDecrease: this.advancement.configuration.points > 0
    };

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle clicking the plus and minus buttons.
   * @this {AbilityScoreImprovementConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static #adjustValue(event, target) {
    const action = target.dataset.action;
    const input = target.closest("li").querySelector("input[type=number]");

    if ( action === "decrease" ) input.valueAsNumber -= 1;
    else if ( action === "increase" ) input.valueAsNumber += 1;

    this.submit();
  }

  /* -------------------------------------------- */

  /**
   * Handle locking or unlocking an ability.
   * @this {AbilityScoreImprovementConfig}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #lockValue(event, target) {
    const parent = target.closest("[data-score]");
    const { score } = parent.dataset;
    const input = parent.querySelector(`[name="configuration.locked.${score}"]`);
    input.value = input.value === "true" ? "false" : "true";
    this.submit();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async prepareConfigurationUpdate(configuration) {
    configuration.locked = Object.entries(configuration.locked).reduce((arr, [k, v]) => {
      if ( v ) arr.push(k);
      return arr;
    }, []);
    return configuration;
  }
}
