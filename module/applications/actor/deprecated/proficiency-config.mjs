import SkillToolConfig from "../config/skill-tool-config.mjs";

/**
 * @typedef {FormApplicationOptions} ProficiencyConfigOptions
 * @property {string} key       The ID of the skill or tool being configured.
 * @property {string} property  The property on the actor being configured, either 'skills', or 'tools'.
 */

/**
 * An application responsible for configuring proficiencies and bonuses in tools and skills.
 *
 * @param {Actor5e} actor                     The Actor being configured.
 * @param {ProficiencyConfigOptions} options  Additional configuration options.
 */
export default class ProficiencyConfig extends SkillToolConfig {
  constructor(actor, options) {
    foundry.utils.logCompatibilityWarning(
      "The `ProficiencyConfig` application has been deprecated and replaced with `SkillToolConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    const trait = options.property === "skills" ? "skills" : "tool";
    super({ ...options, document: actor, trait });
  }
}
