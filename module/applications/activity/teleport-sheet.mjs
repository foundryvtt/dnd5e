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
        "systems/dnd5e/templates/activity/parts/teleport-settings.hbs"
      ]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  _getTabs() {
    const tabs = super._getTabs();
    tabs.effect.label = "DND5E.TELEPORT.SECTIONS.Teleport";
    tabs.effect.icon = "fa-solid fa-person-walking-dashed-line-arrow-right";
    return tabs;
  }
}
