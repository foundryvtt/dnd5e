import ArmorClassConfig from "../config/armor-class-config.mjs";

/**
 * Interface for managing a character's armor calculation.
 */
export default class ActorArmorConfig extends ArmorClassConfig {
  constructor(actor, options) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorArmorConfig` application has been deprecated and replaced with `ArmorClassConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
