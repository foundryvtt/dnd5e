import BaseConfigSheet from "./base-config.mjs";

/**
 * A simple form to configure Actor senses.
 */
export default class ActorSensesConfig extends BaseConfigSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/senses-config.hbs",
      width: 300,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("DND5E.SensesConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const source = this.document.toObject().system.attributes?.senses || {};
    const data = {
      senses: {},
      special: source.special ?? "",
      units: source.units, movementUnits: CONFIG.DND5E.movementUnits
    };
    for ( let [name, label] of Object.entries(CONFIG.DND5E.senses) ) {
      const v = Number(source[name]);
      data.senses[name] = {
        label: game.i18n.localize(label),
        value: Number.isNumeric(v) ? v.toNearest(0.1) : 0
      };
    }
    return data;
  }
}
