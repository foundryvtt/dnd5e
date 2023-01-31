import BaseConfigSheet from "./base-config.mjs";

/**
 * A simple form to set skill configuration for a given skill.
 *
 * @param {Actor} actor                 The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options  Additional application configuration options.
 * @param {string} skillId              The skill key as defined in CONFIG.DND5E.skills.
 * @deprecated since dnd5e 2.2, targeted for removal in 2.4
 */
export default class ActorSkillConfig extends BaseConfigSheet {
  constructor(actor, options, skillId) {
    super(actor, options);
    this._skillId = skillId;

    foundry.utils.logCompatibilityWarning("ActorSkillConfig has been deprecated in favor of the more general "
      + "ProficiencyConfig available at 'dnd5e.applications.actor.ProficiencyConfig'. Support for the old application "
      + "will be removed in a future version.", {since: "DnD5e 2.2", until: "DnD5e 2.4"});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/skill-config.hbs",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const label = CONFIG.DND5E.skills[this._skillId].label;
    return `${game.i18n.format("DND5E.SkillConfigureTitle", {skill: label})}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    const src = this.document.toObject();
    return {
      abilities: CONFIG.DND5E.abilities,
      skill: src.system.skills?.[this._skillId] ?? this.document.system.skills[this._skillId] ?? {},
      skillId: this._skillId,
      proficiencyLevels: CONFIG.DND5E.proficiencyLevels,
      bonusGlobal: src.system.bonuses?.abilities.skill
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    const passive = formData[`system.skills.${this._skillId}.bonuses.passive`];
    const passiveRoll = new Roll(passive);
    if ( !passiveRoll.isDeterministic ) {
      const message = game.i18n.format("DND5E.FormulaCannotContainDiceError", {
        name: game.i18n.localize("DND5E.SkillBonusPassive")
      });
      ui.notifications.error(message);
      throw new Error(message);
    }
    super._updateObject(event, formData);
  }
}
