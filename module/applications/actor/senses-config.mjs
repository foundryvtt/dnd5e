/**
 * A simple form to configure Actor senses.
 */
export default class ActorSensesConfig extends DocumentSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shaper"],
      template: "systems/shaper/templates/apps/senses-config.hbs",
      width: 300,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize("SHAPER.SensesConfig")}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const source = this.document.toObject().system.attributes?.senses || {};
    const data = {
      senses: {},
      special: source.special ?? "",
      units: source.units, movementUnits: CONFIG.SHAPER.movementUnits
    };
    for ( let [name, label] of Object.entries(CONFIG.SHAPER.senses) ) {
      const v = Number(source[name]);
      data.senses[name] = {
        label: game.i18n.localize(label),
        value: Number.isNumeric(v) ? v.toNearest(0.1) : 0
      };
    }
    return data;
  }
}
