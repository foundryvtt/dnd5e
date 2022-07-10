/**
 * A simple form to set save throw configuration for a given ability score.
 * @param {Actor} actor                   The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options    Additional application configuration options.
 * @param {string} abilityId              The ability ID (e.g. "str")
 */
export default class ActorAbilityConfig extends DocumentSheet {
  constructor(actor, opts, abilityId) {
    super(actor, opts);
    this._abilityId = abilityId;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/ability-config.html",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return `${game.i18n.format("DND5E.AbilityConfigureTitle", {ability: CONFIG.DND5E.abilities[this._abilityId]})}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options) {
    const src = this.object.toObject();
    return {
      ability: src.system.abilities[this._abilityId] || {},
      labelSaves: game.i18n.format("DND5E.AbilitySaveConfigure", {ability: CONFIG.DND5E.abilities[this._abilityId]}),
      labelChecks: game.i18n.format("DND5E.AbilityCheckConfigure", {ability: CONFIG.DND5E.abilities[this._abilityId]}),
      abilityId: this._abilityId,
      proficiencyLevels: {
        0: CONFIG.DND5E.proficiencyLevels[0],
        1: CONFIG.DND5E.proficiencyLevels[1]
      },
      bonusGlobalSave: src.system.bonuses?.abilities?.save,
      bonusGlobalCheck: src.system.bonuses?.abilities?.check
    };
  }
}
