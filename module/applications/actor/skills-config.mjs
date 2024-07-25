import DialogMixin from "../dialog-mixin.mjs";
import ProficiencyConfig from "./proficiency-config.mjs";

export default class ActorSkillsConfig extends DialogMixin(DocumentSheet) {
  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e2", "dialog", "skills-config"],
      template: "systems/dnd5e/templates/apps/skills-config.hbs",
      width: 500,
      height: "auto",
      sheetConfig: false,
      submitOnClose: true,
      submitOnChange: true,
      closeOnSubmit: false
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData(options={}) {
    const context = { skills: [] };
    const source = this.document._source.system.skills;
    const { skills } = this.document.system;

    for ( const [key, skill] of Object.entries(skills) ) {
      context.skills.push({
        key,
        label: CONFIG.DND5E.skills[key]?.label,
        value: source[key]?.value,
        total: skill.total,
        tooltip: CONFIG.DND5E.proficiencyLevels[skill.value]
      });
    }

    context.skills.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    context.rows = Math.ceil(context.skills.length / 2);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".config-button").on("click", this._onConfigureSkill.bind(this));
    html.find("proficiency-cycle").on("change", this._onChangeInput.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the skill configuration dialog.
   * @param {MouseEvent} event  The triggering click event.
   * @protected
   */
  _onConfigureSkill(event) {
    const { key } = event.currentTarget.closest("[data-key]").dataset;
    new ProficiencyConfig(this.document, { property: "skills", key }).render(true);
  }
}
