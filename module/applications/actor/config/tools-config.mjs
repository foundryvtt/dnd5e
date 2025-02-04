import SkillToolConfig from "./skill-tool-config.mjs";
import TraitsConfig from "./traits-config.mjs";

/**
 * Configuration application for actor's tools.
 */
export default class ToolsConfig extends TraitsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["trait-columns", "tools"],
    trait: "tool",
    actions: {
      configure: ToolsConfig.#configureTool
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/tools-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processChoice(data, key, choice, categoryChosen=false) {
    super._processChoice(data, key, choice, categoryChosen);
    const tool = data[key];
    if ( tool ) {
      choice.hasEntry = true;
      choice.value = tool.value;
      choice.total = this.document.system.tools[key]?.total;
    }
    choice.tooltip = CONFIG.DND5E.proficiencyLevels[tool?.value ?? 0];
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
   * Open the configuration sheet for a tool.
   * @this {ToolsConfig}
   * @param {Event} event         Triggering click event.
   * @param {HTMLElement} target  Button that was clicked.
   */
  static async #configureTool(event, target) {
    const { key } = target.closest("[data-key]").dataset;
    new SkillToolConfig({ document: this.document, trait: this.options.trait, key }).render(true);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _processFormData(event, form, formData) {
    const submitData = Object.entries(formData.object).reduce((obj, [k, value]) => {
      const key = k.split(".")[2];
      const tool = this.document.system._source.tools[key];
      const config = CONFIG.DND5E.tools[key];
      if ( tool && !value ) obj[`system.tools.-=${key}`] = null;
      else if ( !tool && value ) obj[`system.tools.${key}`] = { value, ability: config?.ability || "int" };
      else if ( value ) obj[`system.tools.${key}.value`] = value;
      return obj;
    }, {});
    return foundry.utils.expandObject(submitData);
  }
}
