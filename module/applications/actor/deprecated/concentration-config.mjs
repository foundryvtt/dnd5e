import ConcentrationConfig from "../config/concentration-config.mjs";

/**
 * A sub-application of the ActorSheet used to configure concentration saving throws.
 * @extends {BaseConfigSheet}
 */
export default class ActorConcentrationConfig extends ConcentrationConfig {
  constructor(actor, options) {
    foundry.utils.logCompatibilityWarning(
      "The `ActorConcentrationConfig` application has been deprecated and replaced with `ConcentrationConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
