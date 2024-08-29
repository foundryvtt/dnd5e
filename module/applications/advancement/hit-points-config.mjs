import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for hit points.
 */
export default class HitPointsConfig extends AdvancementConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "systems/dnd5e/templates/advancement/hit-points-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData() {
    return foundry.utils.mergeObject(super.getData(), {
      hitDie: this.advancement.hitDie
    });
  }
}
