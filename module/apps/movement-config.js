/**
 * A simple form to set actor movement speeds
 * @implements {BaseEntitySheet}
 */
export default class MovementConfig extends BaseEntitySheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/movement-config.html",
      width: 240,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  get title() {
    return game.i18n.localize("DND5E.MovementConfig");
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.movement = data.entity.data.attributes.movement;
    data.distanceUnits = CONFIG.DND5E.distanceUnits;
    return data;
  }
}
