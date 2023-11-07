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
      height: "auto",
      keyPath: "system.attributes.senses"
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
    const source = this.document.toObject();
    const senses = foundry.utils.getProperty(source, this.options.keyPath) ?? {};
    return foundry.utils.mergeObject(super.getData(options), {
      senses: Object.entries(CONFIG.DND5E.senses).reduce((obj, [k, label]) => {
        obj[k] = { label, value: senses[k] ?? 0 };
        return obj;
      }, {}),
      special: senses.special ?? "",
      units: senses.units, movementUnits: CONFIG.DND5E.movementUnits,
      keyPath: this.options.keyPath
    });
  }
}
