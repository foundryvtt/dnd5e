import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the teleport activity.
 */
export default class TeleportSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["teleport-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dnd5e/templates/activity/teleport-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dnd5e/templates/activity/parts/teleport-settings.hbs"
      ]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    context.source.teleport = this.activity._source.teleport ?? context.source.teleport;
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare the tab information for the sheet.
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.TELEPORT.SECTIONS.Teleport";
    tabs.effect.icon = "fa-solid fa-person-rays";
    return tabs;
  }
}
