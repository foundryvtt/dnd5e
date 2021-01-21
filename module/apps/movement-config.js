/**
 * A simple form to set actor movement speeds
 * @implements {BaseEntitySheet}
 */
export default class ActorMovementConfig extends BaseEntitySheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/movement-config.html",
      width: 300,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.localize("DND5E.MovementConfig")}: ${this.actor.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const sourceMovement = foundry.utils.getProperty(this.document.data._source, "data.attributes.senses") || {};
    const data = {
      movement: foundry.utils.deepClone(sourceMovement),
      units: CONFIG.DND5E.movementUnits
    };
    for ( let [k, v] of Object.entries(data.movement) ) {
      if ( ["units", "hover"].includes(k) ) continue;
      data.movement[k] = Number.isNumeric(v) ? v.toNearest(0.1) : 0;
    }
    return data;
  }
}
