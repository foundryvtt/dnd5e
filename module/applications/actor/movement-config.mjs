import BaseConfigSheet from "./base-config.mjs";

/**
 * A simple form to set actor movement speeds.
 */
export default class ActorMovementConfig extends BaseConfigSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/movement-config.hbs",
      width: 300,
      height: "auto",
      sheetConfig: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.MovementConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options={}) {
    const source = this.document.toObject();
    const isActor = this.document instanceof Actor;
    const keyPath = isActor ? "system.attributes.movement" : "system.movement";

    // Current movement values
    const movement = foundry.utils.getProperty(source, keyPath) ?? {};
    for ( let [k, v] of Object.entries(movement) ) {
      if ( ["units", "hover"].includes(k) ) continue;
      movement[k] = Number.isNumeric(v) ? v.toNearest(0.1) : null;
    }

    // Allowed speeds
    const speeds = source.type === "group" ? {
      land: "DND5E.MovementLand",
      water: "DND5E.MovementWater",
      air: "DND5E.MovementAir"
    } : {
      walk: "DND5E.MovementWalk",
      burrow: "DND5E.MovementBurrow",
      climb: "DND5E.MovementClimb",
      fly: "DND5E.MovementFly",
      swim: "DND5E.MovementSwim"
    };

    // Return rendering context
    return {
      speeds,
      movement,
      selectUnits: source.type !== "group",
      canHover: isActor && (source.type !== "group"),
      units: CONFIG.DND5E.movementUnits,
      keyPath
    };
  }
}
