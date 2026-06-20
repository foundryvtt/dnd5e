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

    const actor = this.item?.actor;
    if (!actor) {
      context.itemOptions = [];
      context.activityOptions = [];
      return context;
    }

    const currentItemUuid = this.item.uuid;
    const validItems = actor.items.contents.filter(i => i.system.activities?.size > 0 );
    context.itemOptions = [
      { value: "", label: game.i18n.localize("DND5E.FORWARD.Target.Item.Current") },
      ...validItems
        .filter(i => i.uuid !== currentItemUuid)
        .map(i => ({ value: i.id, label: i.name }))
    ];

    const selectedItemId = this.activity._source.targetItem || "";
    const targetItem = selectedItemId ? actor.items.get(selectedItemId) : this.item;
    const activities = targetItem?.system.activities?.contents ?? [];
    const availableActivities = activities.filter(a => (a.type !== "forward") && (CONFIG.DND5E.activityTypes[a.type] !== false));

    context.activityOptions = [
      { value: "", label: "" },
      ...availableActivities.map(activity => ({ value: activity.id, label: activity.name }))
    ];

    const validActivity = availableActivities.some(a => a.id === this.activity._source.activity);
    if (!this.activity._source.activity || !validActivity) {
      const defaultActivity = availableActivities.length > 0 ? availableActivities[0].id : null;
      if (defaultActivity && this.activity._source.activity !== defaultActivity) {
        this.activity.updateSource({ activity: defaultActivity });
      } else if (!availableActivities.length && this.activity._source.activity !== null) {
        this.activity.updateSource({ activity: null });
      }
    }
    
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onChangeForm(formConfig, event) {
    if (event.target.name === "targetItem") {
      this.activity.update({ targetItem: event.target.value });
      this.render({ force: true });
      return;
    }
    super._onChangeForm(formConfig, event);
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
