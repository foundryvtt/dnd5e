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

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareEffectContext(context, options) {
    context = await super._prepareEffectContext(context, options);
    context.distance = {
      data: context.source.teleport.override ? context.source.teleport : {
        value: Number.isFinite(this.activity.teleport.value) ? this.activity.teleport.value : "∞",
        units: this.activity.teleport.units
      },
      disabled: !context.source.teleport.override
    };
    return context;
  }
}
