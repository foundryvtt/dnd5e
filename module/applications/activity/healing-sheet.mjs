import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the healing activity.
 */
export default class HealingSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["healing-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/healing-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dnd5e/templates/activity/parts/damage-part.hbs",
        "systems/dnd5e/templates/activity/parts/healing-damage.hbs"
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
