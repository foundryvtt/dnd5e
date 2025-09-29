import CompendiumBrowser from "../compendium-browser.mjs";
import AdvancementFlow from "./advancement-flow-v2.mjs";

/**
 * Inline application that presents the player with a choice between ability score improvement and taking a feat.
 */
export default class AbilityScoreImprovementFlow extends AdvancementFlow {

  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      browse: AbilityScoreImprovementFlow.#browseCompendium,
      decrease: AbilityScoreImprovementFlow.#adjustValue,
      deleteItem: AbilityScoreImprovementFlow.#deleteItem,
      increase: AbilityScoreImprovementFlow.#adjustValue
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-flow.hbs",
      templates: ["systems/dnd5e/templates/advancement/parts/advancement-ability-score-control.hbs"]
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Data on the feat selected.
   * @type {{ item: Item5e, uuid: string }|null}
   */
  get feat() {
    const [id, uuid] = Object.entries(this.advancement.value.feat ?? {})[0] ?? [];
    const item = this.advancement.actor.items.get(id);
    if ( item ) return { item, uuid };
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Data on points that can be assigned.
   * @type {{ assigned: number, available: number, cap: number, total: number }}
   */
  get points() {
    const { configuration, value } = this.advancement;
    const points = {
      assigned: Object.keys(CONFIG.DND5E.abilities).reduce((assigned, key) => {
        if ( !this.advancement.canImprove(key) || configuration.locked.has(key) ) return assigned;
        return assigned + (value.assignments?.[key] ?? 0) - (configuration.fixed[key] ?? 0);
      }, 0),
      cap: configuration.cap ?? Infinity,
      total: configuration.points
    };
    points.available = points.total - points.assigned;
    return points;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContentContext(context, options) {
    const { actor, configuration, value } = this.advancement;

    context.feat = this.feat?.item;
    context.isASI = value.type === "asi";
    context.points = this.points;

    const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });

    context.lockImprovement = value.type === "feat";
    context.abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [key, data]) => {
      if ( !this.advancement.canImprove(key) ) return obj;
      const ability = actor.system.abilities[key];
      const assignment = value.assignments?.[key] ?? 0;
      const fixed = configuration.fixed[key] ?? 0;
      const locked = configuration.locked.has(key);
      const initial = ability.value - assignment;
      const abilityMax = Math.max(ability.max, configuration.max ?? -Infinity);
      const max = locked ? (initial + fixed) : Math.min(ability.value + context.points.available, abilityMax);
      const min = Math.min(initial + fixed, abilityMax);
      obj[key] = {
        key, max, min,
        value: ability.value,
        name: `abilities.${key}`,
        label: data.label,
        initial: ability.value + fixed,
        delta: (ability.value - initial) ? formatter.format(ability.value - initial) : null,
        showDelta: true,
        isDisabled: context.lockImprovement,
        isFixed: !!locked || (ability.value >= abilityMax),
        isLocked: locked,
        canIncrease: (ability.value < max) && (assignment < context.points.cap) && !locked
          && !context.lockImprovement,
        canDecrease: (ability.value > (initial + fixed)) && !locked && !context.lockImprovement
      };
      return obj;
    }, {});

    const recommendation = this.advancement.isEpicBoon ? fromUuidSync(configuration.recommendation)
      : null;
    if ( recommendation ) {
      const { img, name, uuid } = recommendation;
      context.recommendation = {
        img, name, uuid,
        checked: this.feat?.uuid === uuid,
        locked: context.isASI || (this.feat && (this.feat.uuid !== uuid))
      };
    }

    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const pluralRules = new Intl.PluralRules(game.i18n.lang);
    context.pointCap = game.i18n.format(
      `DND5E.ADVANCEMENT.AbilityScoreImprovement.CapDisplay.${pluralRules.select(context.points.cap)}`,
      { points: context.points.cap }
    );
    context.pointsRemaining = game.i18n.format(
      `DND5E.ADVANCEMENT.AbilityScoreImprovement.PointsRemaining.${pluralRules.select(context.points.available)}`,
      { points: context.points.available }
    );
    context.showASIFeat = modernRules && this.advancement.allowFeat;
    context.showBrowseButton = !context.isASI && (!this.feat || (this.feat.uuid !== recommendation?.uuid));
    context.showImprovement = !modernRules || !this.advancement.allowFeat || context.isASI;
    context.staticIncrease = !configuration.points;

    return context;
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: "form",
      callbacks: {
        drop: this._onDrop.bind(this)
      }
    }).bind(this.element);
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @this {AbilityScoreImprovementFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #browseCompendium(event, target) {
    const filters = {
      locked: {
        additional: { category: { feat: 1 } },
        types: new Set(["feat"])
      }
    };
    const result = await CompendiumBrowser.selectOne({ filters, tab: "feats" });
    if ( !result ) return;

    // TODO: Remove this unnecessary check when https://github.com/foundryvtt/dnd5e/issues/5139 is implemented
    const item = await fromUuid(result);
    const isValid = item.system.validatePrerequisites?.(this.advancement.actor, { showMessage: true });
    if ( isValid === true ) {
      await this.advancement.apply(this.level, {
        retainedItems: this.retainedData?.retainedItems, type: "feat", uuid: result
      });
      this.render();
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the plus and minus buttons.
   * @this {AbilityScoreImprovementFlow}
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
   * Handle removing a selected item.
   * @this {AbilityScoreImprovementFlow}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #deleteItem(event, target) {
    await this.advancement.reverse();
    this.render();
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async _handleForm(event, form, formData) {
    switch (event.target?.name) {
      case "asi-selected":
        if ( event.target.checked ) await this.advancement.apply(this.level, { type: "asi" });
        else await this.advancement.reverse(this.level);
        return;
      case "recommendation-selected":
        if ( event.target.checked ) await this.advancement.apply(this.level, {
          retainedItems: this.retainedData?.retainedItems,
          type: "feat",
          uuid: this.advancement.configuration.recommendation
        });
        else await this.advancement.reverse(this.level);
        return;
    }

    const abilities = this.advancement.actor.system._source.abilities ?? {};
    const { available, cap } = this.points;
    const assignments = Object.keys(CONFIG.DND5E.abilities).reduce((obj, key) => {
      const value = formData.object[`abilities.${key}`];
      if ( (value === undefined) || this.advancement.configuration.locked.has(key) ) return obj;
      const abilityMax = Math.max(abilities[key]?.max ?? 20, this.advancement.configuration.max ?? -Infinity);
      const current = abilities[key]?.value ?? 0;
      const initial = current - (this.advancement.value.assignments?.[key] ?? 0);
      const max = Math.min(current + available, initial + cap, abilityMax);
      const min = Math.min(initial + (this.advancement.configuration.fixed[key] ?? 0), abilityMax);
      const delta = Math.min(Math.clamp(value, min, max) - current, this.points.available);
      if ( delta ) obj[key] = delta;
      return obj;
    }, {});
    if ( !foundry.utils.isEmpty(assignments) ) await this.advancement.apply(this.level, { assignments, type: "asi" });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDrop(event) {
    if ( !this.advancement.allowFeat || (this.advancement.value.type === "asi") ) return false;

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    if ( (item.type !== "feat") || (item.system.type.value !== "feat") ) {
      ui.notifications.error("DND5E.ADVANCEMENT.AbilityScoreImprovement.Warning.Type", {localize: true});
      return null;
    }

    const isValid = item.system.validatePrerequisites?.(this.advancement.actor, { showMessage: true });
    if ( isValid !== true ) return null;

    await this.advancement.apply(this.level, {
      retainedItems: this.retainedData?.retainedItems, type: "feat", uuid: item.uuid
    });
    this.render();
  }
}
