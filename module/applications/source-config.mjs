import SourceConfig from "./shared/source-config.mjs";

/**
 * Application for configuring the source data on actors and items.
 */
export default class SourceConfigDeprecated extends SourceConfig {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `SourceConfig` application has been moved to `applications.shared.SourceConfig`.",
      { since: "DnD5e 4.1", until: "DnD5e 4.3" }
    );
    super(...args);
  }
}
