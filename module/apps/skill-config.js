/**
 * A simple form to set skill configuration for a given skill.
 * @extends {DocumentSheet}
 * @param {Actor} actor                   The Actor instance being displayed within the sheet.
 * @param {ApplicationOptions} options    Additional application configuration options.
 * @param {string} skillId                The skill id (e.g. "ins")
 */
export default class ActorSkillConfig extends DocumentSheet {

  constructor(actor, opts, skillId) {
    super(actor, opts);
    this._skillId = skillId;
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e"],
      template: "systems/dnd5e/templates/apps/skill-config.html",
      width: 500,
      height: "auto"
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.format("DND5E.SkillConfigureTitle", {skill: CONFIG.DND5E.skills[this._skillId]})}: ${this.document.name}`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  getData(options) {
    return {
      skill: foundry.utils.getProperty(this.document.data._source, `data.skills.${this._skillId}`) || {},
      skillId: this._skillId,
      proficiencyLevels: CONFIG.DND5E.proficiencyLevels,
      bonusGlobal: getProperty(this.object.data._source, "data.bonuses.abilities.skill")
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _updateObject(event, formData) {
    const passive = formData[`data.skills.${this._skillId}.bonuses.passive`];
    const passiveRoll = new Roll(passive);
    if ( !passiveRoll.isDeterministic ) {
      const message = game.i18n.format("DND5E.FormulaCannotContainDiceWarn", {
        name: game.i18n.localize("DND5E.SkillBonusPassive")
      });
      ui.notifications.error(message);
      throw new Error(message);
    }

    super._updateObject(event, formData);
  }

}
