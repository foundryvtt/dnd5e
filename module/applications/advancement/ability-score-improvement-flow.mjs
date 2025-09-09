import CompendiumBrowser from "../compendium-browser.mjs";
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

  /** @inheritDoc */
  static _customElements = super._customElements.concat(["dnd5e-checkbox"]);

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
  async retainData(data) {
    await super.retainData(data);
    this.assignments = this.retainedData.assignments ?? {};
    const featUuid = Object.values(this.retainedData.feat ?? {})[0];
    if ( featUuid ) this.feat = await fromUuid(featUuid);
    else if ( !foundry.utils.isEmpty(this.assignments) ) this.feat = { isASI: true };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getData() {
    const points = {
      assigned: Object.keys(CONFIG.DND5E.abilities).reduce((assigned, key) => {
        if ( !this.advancement.canImprove(key) || this.advancement.configuration.locked.has(key) ) return assigned;
        return assigned + (this.assignments[key] ?? 0);
      }, 0),
      cap: this.advancement.configuration.cap ?? Infinity,
      total: this.advancement.configuration.points
    };
    points.available = points.total - points.assigned;

    const formatter = new Intl.NumberFormat(game.i18n.lang, { signDisplay: "always" });

    const lockImprovement = this.feat && !this.feat.isASI;
    const abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [key, data]) => {
      if ( !this.advancement.canImprove(key) ) return obj;
      const ability = this.advancement.actor.system.abilities[key];
      const assignment = this.assignments[key] ?? 0;
      const fixed = this.advancement.configuration.fixed[key] ?? 0;
      const locked = this.advancement.configuration.locked.has(key);
      const abilityMax = Math.max(ability.max, this.advancement.configuration.max ?? -Infinity);
      const value = Math.min(ability.value + fixed + assignment, abilityMax);
      const max = locked ? value : Math.min(value + points.available, abilityMax);
      const min = Math.min(ability.value + fixed, abilityMax);
      obj[key] = {
        key, max, min, value,
        name: `abilities.${key}`,
        label: data.label,
        initial: ability.value + fixed,
        delta: (value - ability.value) ? formatter.format(value - ability.value) : null,
        showDelta: true,
        isDisabled: lockImprovement,
        isLocked: !!locked || (ability.value >= abilityMax),
        canIncrease: (value < max) && ((fixed + assignment) < points.cap) && !locked && !lockImprovement,
        canDecrease: (value > (ability.value + fixed)) && !locked && !lockImprovement
      };
      return obj;
    }, {});

    let recommendation = this.advancement.isEpicBoon ? fromUuidSync(this.advancement.configuration.recommendation)
      : null;
    if ( recommendation ) {
      const { img, name, uuid } = recommendation;
      recommendation = {
        img, name, uuid,
        checked: this.feat?.uuid === uuid,
        locked: this.feat && (this.feat.uuid !== uuid)
      };
    }

    const modernRules = game.settings.get("dnd5e", "rulesVersion") === "modern";
    const pluralRules = new Intl.PluralRules(game.i18n.lang);
    return foundry.utils.mergeObject(super.getData(), {
      abilities, lockImprovement, points, recommendation,
      feat: this.feat,
      pointCap: game.i18n.format(
        `DND5E.ADVANCEMENT.AbilityScoreImprovement.CapDisplay.${pluralRules.select(points.cap)}`, { points: points.cap }
      ),
      pointsRemaining: game.i18n.format(
        `DND5E.ADVANCEMENT.AbilityScoreImprovement.PointsRemaining.${pluralRules.select(points.available)}`,
        {points: points.available}
      ),
      showASIFeat: modernRules && this.advancement.allowFeat,
      showImprovement: !modernRules || !this.advancement.allowFeat || this.feat?.isASI,
      staticIncrease: !this.advancement.configuration.points
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".adjustment-button").click(this._onClickButton.bind(this));
    html.find("[data-action='browse']").click(this._onBrowseCompendium.bind(this));
    html.find("[data-action='delete']").click(this._onItemDelete.bind(this));
    html.find("[data-action='viewItem']").click(this._onClickFeature.bind(this));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onChangeInput(event) {
    super._onChangeInput(event);
    const input = event.currentTarget;
    if ( input.name === "asi-selected" ) {
      if ( input.checked ) this.feat = { isASI: true };
      else {
        if ( this.feat?.isASI ) this.assignments = {};
        this.feat = null;
      }
    } else if ( input.name === "recommendation-selected" ) {
      if ( input.checked ) this.feat = await fromUuid(this.advancement.configuration.recommendation);
      else this.feat = null;
    } else {
      const key = input.closest("[data-score]").dataset.score;
      if ( isNaN(input.valueAsNumber) ) this.assignments[key] = 0;
      else {
        this.assignments[key] = Math.min(
          Math.clamp(input.valueAsNumber, Number(input.min), Number(input.max)) - Number(input.dataset.initial),
          (this.advancement.configuration.cap - (this.advancement.configuration.fixed[key] ?? 0)) ?? Infinity
        );
      }
    }
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle opening the compendium browser and displaying the result.
   * @param {PointerEvent} event  The triggering event.
   * @protected
   */
  async _onBrowseCompendium(event) {
    event.preventDefault();
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
      this.feat = item;
      this.render();
    }
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
    const uuid = event.target.closest("[data-uuid]")?.dataset.uuid;
    const item = await fromUuid(uuid);
    item?.sheet.render(true);
  }

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

  /** @inheritDoc */
  async _updateObject(event, formData) {
    await this.advancement.apply(this.level, {
      type: (this.feat && !this.feat.isASI) ? "feat" : "asi",
      assignments: this.assignments,
      featUuid: this.feat?.uuid,
      retainedItems: this.retainedData?.retainedItems
    });
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @inheritDoc */
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

    if ( (item.type !== "feat") || (item.system.type.value !== "feat") ) {
      ui.notifications.error("DND5E.ADVANCEMENT.AbilityScoreImprovement.Warning.Type", {localize: true});
      return null;
    }

    const isValid = item.system.validatePrerequisites?.(this.advancement.actor, { showMessage: true });
    if ( isValid !== true ) return null;

    this.feat = item;
    this.render();
  }
}
