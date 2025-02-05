import SkillToolConfig from "./skill-tool-config.mjs";
import TraitsConfig from "./traits-config.mjs";

/**
 * Configuration application for actor's skills.
 */
export default class SkillsConfig extends TraitsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["skills"],
    trait: "skills",
    actions: {
      configure: SkillsConfig.#configureSkill
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/skills-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.skills = context.choices.OTHER.children;
    context.rows = Math.ceil(Object.keys(context.skills).length / 2);
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _processChoice(data, key, choice, categoryChosen=false) {
    super._processChoice(data, key, choice, categoryChosen);
    const skill = data[key];
    if ( skill ) {
      choice.value = skill.value;
      choice.total = this.document.system.skills[key]?.total;
      choice.tooltip = CONFIG.DND5E.proficiencyLevels[skill.value];
    }
  }

  /* -------------------------------------------- */
  /*  Life-Cycle Handlers                         */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("proficiency-cycle").forEach(e => {
      e.addEventListener("change", event => this.submit());
    });
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Open the configuration sheet for a skill.
   * @this {SkillsConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #configureSkill(event, target) {
    const { key } = target.closest("[data-key]").dataset;
    new SkillToolConfig({ document: this.document, trait: "skills", key }).render(true);
  }
}
