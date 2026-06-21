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
    _resolveTargetItem(actor, target) {
      if (!target || !actor || actor.items.has(target)) return target;

      // Re-link UUID target
      const { type } = foundry.utils.parseUuid(target) ?? {};
      if (type === "Item") {
          const item = actor.sourcedItems?.get(target)?.first();
          if (item) return item.id;
      }

      // Re-link identifier target
      else {
          const item = actor.identifiedItems?.get(target)?.first();
          if (item) return item.id;
      }

      return target;
  }

  /* -------------------------------------------- */
  
  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);

    const actor = this.item?.actor;
    const currentItemId = this.item.id;
    const currentTargetItem = this.activity._source.targetItem;
    const targetId = this._resolveTargetItem(actor, currentTargetItem);
    const currentTarget = targetId || currentItemId;
    const currentActivityId = this.activity._source.activity;

    let itemOptions = [];
    let activityOptions = [{ value: "", label: "" }];
    let showActivitySelect = false;
    let availableActivities = [];

    let displayTargetId = currentTargetItem;
    const isCurrentItem = !currentTargetItem || currentTargetItem === currentItemId || targetId === currentItemId;
    if (targetId && targetId !== currentTargetItem) {
      displayTargetId = targetId;
    } else if (isCurrentItem) {
      displayTargetId = "";
    }

    const validateAndUpdateActivity = (activities) => {
      const isValid = activities.some(a => a.id === currentActivityId);

      if (!currentActivityId || !isValid) {
        const defaultActivityId = activities.length > 0 ? activities[0].id : null;
        if (currentActivityId !== defaultActivityId) {
          this.activity.updateSource({ activity: defaultActivityId });
        }
      }
    };

    if (actor) {
      const validItems = actor.items.contents.filter(i => i.system.activities?.size > 0 );
      itemOptions = [
        { value: "", label: game.i18n.localize("DND5E.FORWARD.Target.Item.Current") },
        ...validItems.filter(i => i.uuid !== this.item.uuid)
        .map(i => ({ value: i.id, label: i.name, selected: i.id === displayTargetId }))
      ];
      const isInOptions = itemOptions.some(opt => opt.value === currentTarget);
      if (currentTarget && !isInOptions) {
        const label = actor?.items.get(currentTarget)?.name ?? currentTarget;
        itemOptions.unshift({ value: currentTarget, label: `[${label}]` });
      }

      const targetItem = actor?.items?.get(currentTarget) ?? this.item;
      const activities = targetItem?.system.activities?.contents ?? [];
      availableActivities = targetItem.system.activities?.contents.filter(
        a => a.type !== "forward" && CONFIG.DND5E.activityTypes[a.type] !== false
      ) ?? [];

      showActivitySelect = true;
      validateAndUpdateActivity(availableActivities);

    } else {
      if (!targetId || targetId === currentItemId) {
        availableActivities = this.item.system.activities?.contents.filter(
          a => a.type !== "forward" && CONFIG.DND5E.activityTypes[a.type] !== false
        ) ?? [];

        showActivitySelect = true;
        validateAndUpdateActivity(availableActivities);
      } else {
        showActivitySelect = false;
      }
    }

    if (showActivitySelect && availableActivities.length > 0) {
      activityOptions = [
        { value: "", label: "" },
        ...availableActivities.map(a => ({ value: a.id, label: a.name }))
      ];
    }

    context.itemOptions = itemOptions;
    context.activityOptions = activityOptions;
    context.actor = actor;
    context.showActivitySelect = showActivitySelect;
    
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
