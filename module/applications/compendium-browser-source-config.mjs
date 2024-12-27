import CompendiumBrowserSettingsConfig from "./settings/compendium-browser-settings.mjs";

/**
 * An application for configuring which compendium packs contribute their content to the compendium browser.
 * @extends Application5e<CompendiumBrowserSourceConfiguration>
 */
export default class CompendiumBrowserSourceConfig extends CompendiumBrowserSettingsConfig {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `CompendiumBrowserSourceConfig` application has been deprecated and replaced with `CompendiumBrowserSettingsConfig`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    super(...args);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Collate sources for inclusion in the compendium browser.
   * @returns {Set<string>}  The set of packs that should be included in the compendium browser.
   */
  static collateSources() {
    foundry.utils.logCompatibilityWarning(
      "The `CompendiumBrowserSourceConfig` application has been deprecated and replaced with `CompendiumBrowserSettingsConfig`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    return super.collateSources();
  }
}
