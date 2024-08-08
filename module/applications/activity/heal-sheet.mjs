import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the healing activity.
 */
export default class HealSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["heal-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/heal-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dnd5e/templates/activity/parts/damage-part.hbs",
        "systems/dnd5e/templates/activity/parts/heal-healing.hbs"
      ]
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context) {
    context = await super._prepareEffectContext(context);
    context.typeOptions = Object.entries(CONFIG.DND5E.healingTypes).map(([value, config]) => ({
      value, label: config.label, selected: context.activity.healing.types.has(value)
    }));
    return context;
  }
}
