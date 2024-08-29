import BaseConfigSheet from "./base-config.mjs";

/**
 * A simple form to set actor movement speeds.
 */
export default class ActorMovementConfig extends BaseConfigSheet {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/movement-config.hbs",
      width: 300,
      height: "auto",
      keyPath: "system.attributes.movement"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get title() {
    return `${game.i18n.localize("DND5E.MovementConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options={}) {
    const source = this.document.toObject();
    const movement = foundry.utils.getProperty(source, this.options.keyPath) ?? {};
    const raceData = this.document.system.details?.race?.system?.movement ?? {};

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

    return {
      movement,
      movements: Object.entries(speeds).reduce((obj, [k, label]) => {
        obj[k] = { label, value: movement[k], placeholder: raceData[k] ?? 0 };
        return obj;
      }, {}),
      selectUnits: Object.hasOwn(movement, "units"),
      canHover: Object.hasOwn(movement, "hover"),
      units: CONFIG.DND5E.movementUnits,
      unitsPlaceholder: game.i18n.format("DND5E.AutomaticValue", {
        value: CONFIG.DND5E.movementUnits[raceData.units ?? Object.keys(CONFIG.DND5E.movementUnits)[0]]?.toLowerCase()
      }),
      keyPath: this.options.keyPath
    };
  }
}
