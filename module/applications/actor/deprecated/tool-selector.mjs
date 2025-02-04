import ToolsConfig from "../config/tools-config.mjs";

/**
 * A specialized version of the TraitSelector used for selecting tool and vehicle proficiencies.
 * @extends {TraitSelector}
 */
export default class ToolSelector extends ToolsConfig {
  constructor(actor, trait, options={}) {
    foundry.utils.logCompatibilityWarning(
      "The `ToolSelector` application has been deprecated and replaced with `ToolsConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super({ ...options, document: actor });
  }
}
