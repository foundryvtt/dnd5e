import AdvancementFlow from "./advancement-flow.mjs";

/**
 * Inline application that presents the player with a choice between ability score improvement and taking a feat.
 */
export default class AbilityScoreImprovementFlow extends AdvancementFlow {

  /**
   * Player assignments to abilities.
   * @type {Object<string, number>}
   */
  assignments = {};

  /* -------------------------------------------- */

  /**
   * The dropped feat item.
   * @type {Item5e}
   */
  feat;

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      dragDrop: [{ dropSelector: "form" }],
      template: "systems/dnd5e/templates/advancement/ability-score-improvement-flow.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async retainData(data) {
    super.retainData(data);
    this.assignments = this.retainedData.assignments ?? {};
    const featUuid = Object.values(this.retainedData.feat ?? {})[0];
    if ( featUuid ) this.feat = await fromUuid(featUuid);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData() {
    const points = {
      assigned: Object.entries(CONFIG.DND5E.abilities).reduce((assigned, [key, data]) => {
          if ( data.improvement === false ) return assigned;
          return assigned + (this.advancement.configuration.fixed[key] ?? 0) + (this.assignments[key] ?? 0);
      }, 0),
      total: this.advancement.points.total
    };
    points.available = points.total - points.assigned;

    const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });

    const abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [key, data]) => {
      if ( data.improvement === false ) return obj;
      const ability = this.advancement.actor.system.abilities[key];
      const fixed = this.advancement.configuration.fixed[key] ?? 0;
      const value = Math.min(ability.value + ((fixed || this.assignments[key]) ?? 0), ability.max);
      const max = fixed ? value : Math.min(value + points.available, ability.max);
      obj[key] = {
        key, max, value,
        name: `abilities.${key}`,
        label: data.label,
        initial: ability.value,
        min: fixed ? max : ability.value,
        delta: (value - ability.value) ? formatter.format(value - ability.value) : null,
        showDelta: true,
        isDisabled: !!this.feat,
        isFixed: !!fixed,
        canIncrease: (value < max) && !fixed && !this.feat,
        canDecrease: (value > ability.value) && !fixed && !this.feat
      };
      return obj;
    }, {});

    const pluralRule = new Intl.PluralRules(game.i18n.lang).select(points.available);
    return foundry.utils.mergeObject(super.getData(), {
      abilities, points,
      feat: this.feat,
      staticIncrease: !this.advancement.configuration.points,
      pointsRemaining: game.i18n.format(
        `DND5E.AdvancementAbilityScoreImprovementPointsRemaining.${pluralRule}`, {points: points.available}
      )
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".adjustment-button").click(this._onClickButton.bind(this));
    html.find("a[data-uuid]").click(this._onClickFeature.bind(this));
    html.find("[data-action='delete']").click(this._onItemDelete.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onChangeInput(event) {
    super._onChangeInput(event);
    const input = event.currentTarget;
    const key = input.closest("[data-score]").dataset.score;
    const clampedValue = Math.clamped(input.valueAsNumber, Number(input.min), Number(input.max));
    this.assignments[key] = clampedValue - Number(input.dataset.initial);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking the plus and minus buttons.
   * @param {Event} event  Triggering click event.
   */
  _onClickButton(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    const key = event.currentTarget.closest("li").dataset.score;

    this.assignments[key] ??= 0;
    if ( action === "decrease" ) this.assignments[key] -= 1;
    else if ( action === "increase" ) this.assignments[key] += 1;
    else return;

    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle clicking on a feature during item grant to preview the feature.
   * @param {MouseEvent} event  The triggering event.
   * @protected
   */
  async _onClickFeature(event) {
    event.preventDefault();
    const uuid = event.currentTarget.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    // TODO: Pass through retained feat data
    await this.advancement.apply(this.level, {
      type: this.feat ? "feat" : "asi",
      assignments: this.assignments,
      featUuid: this.feat?.uuid,
      retainedItems: this.retainedData?.retainedItems
    });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /**
   * Handle deleting a dropped feat.
   * @param {Event} event  The originating click event.
   * @protected
   */
  async _onItemDelete(event) {
    event.preventDefault();
    this.feat = null;
    this.render();
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    if ( !this.advancement.allowFeat ) return false;

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch(err) {
      return false;
    }

    if ( data.type !== "Item" ) return false;
    const item = await Item.implementation.fromDropData(data);

    if ( (item.type !== "feat") || (item.system.type.value !== "feat") ) return ui.notifications.error(
      game.i18n.localize("DND5E.AdvancementAbilityScoreImprovementFeatWarning")
    );

    this.feat = item;
    this.render();
  }
}
