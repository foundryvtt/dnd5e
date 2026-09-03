import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the forward activity.
 */
export default class ForwardSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["forward-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    activation: {
      template: "systems/dnd5e/templates/activity/forward-activation.hbs",
      templates: [
        "systems/dnd5e/templates/activity/parts/activity-consumption.hbs"
      ]
    },
    effect: {
      template: "systems/dnd5e/templates/activity/forward-effect.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareActivationContext(context, options) {
    context = await super._prepareActivationContext(context, options);
    context.showConsumeSpellSlot = false;
    context.showScaling = true;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);

    const actor = this.item.actor;
    const sourceTarget = this.activity._source.targetItem;
    const selectedTarget = this.activity._remapConsumptionTarget(sourceTarget);
    let targetItem;

    if ( actor ) {
      const validItems = actor.items.filter(item => this.#getAvailableActivities(item).length);
      context.itemOptions = [
        { value: "", label: _loc("DND5E.FORWARD.Target.Item.Current") },
        ...validItems
          .filter(item => item !== this.item)
          .map(item => ({ value: item.id, label: item.name }))
      ];

      if ( sourceTarget && (selectedTarget !== this.item.id)
        && !context.itemOptions.some(option => option.value === selectedTarget) ) {
        context.itemOptions.unshift({ value: selectedTarget, label: `[${sourceTarget}]` });
      }
      targetItem = sourceTarget ? actor.items.get(selectedTarget) : this.item;
    } else {
      context.itemOptions = null;
      targetItem = sourceTarget ? null : this.item;
    }

    const availableActivities = targetItem ? this.#getAvailableActivities(targetItem) : [];
    context.activityOptions = [
      { value: "", label: "" },
      ...availableActivities.map(activity => ({ value: activity.id, label: activity.name }))
    ];
    context.selectedTargetItem = targetItem === this.item ? "" : selectedTarget ?? "";
    context.showActivitySelect = !!targetItem;

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Get activities on an item that may be forwarded to.
   * @param {Item5e} item  Item containing the activities.
   * @returns {Activity[]}
   */
  #getAvailableActivities(item) {
    return (item.system.activities?.contents ?? []).filter(activity =>
      (activity.type !== "forward") && (CONFIG.DND5E.activityTypes[activity.type] !== false)
    );
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onChangeForm(formConfig, event) {
    if ( event.target.name === "targetItem" ) {
      await this.activity.update({ targetItem: event.target.value || null });
      return this.render({ force: true });
    }
    return super._onChangeForm(formConfig, event);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context, options) {
    context = await super._prepareIdentityContext(context, options);
    context.behaviorFields = [];
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tab information for the sheet.
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs() {
    return this._markTabs({
      identity: {
        id: "identity", group: "sheet", icon: "fa-solid fa-tag",
        label: "DND5E.ACTIVITY.SECTIONS.Identity"
      },
      activation: {
        id: "activation", group: "sheet", icon: "fa-solid fa-clapperboard",
        label: "DND5E.ACTIVITY.SECTIONS.Activation"
      },
      effect: {
        id: "effect", group: "sheet", icon: "fa-solid fa-sun",
        label: "DND5E.ACTIVITY.SECTIONS.Effect"
      }
    });
  }
}
