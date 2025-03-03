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
  async _prepareActivationContext(context) {
    context = await super._prepareActivationContext(context);
    context.showConsumeSpellSlot = false;
    context.showScaling = true;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);
    context.activityOptions = [
      { value: "", label: "" },
      ...this.item.system.activities.contents
        .filter(a => (a.type !== "forward") && (CONFIG.DND5E.activityTypes[a.type] !== false))
        .map(activity => ({ value: activity.id, label: activity.name }))
    ];
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareIdentityContext(context) {
    context = await super._prepareIdentityContext(context);
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
        id: "activation", group: "sheet", icon: "fa-solid fa-boxes-stacked",
        label: "DND5E.CONSUMPTION.FIELDS.consumption.label"
      },
      effect: {
        id: "effect", group: "sheet", icon: "fa-solid fa-sun",
        label: "DND5E.ACTIVITY.SECTIONS.Effect"
      }
    });
  }
}
