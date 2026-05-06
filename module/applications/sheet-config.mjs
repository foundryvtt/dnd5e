/**
 * Sheet config with extra options.
 */
export default class SheetConfig5e extends foundry.applications.apps.DocumentSheetConfig {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "`SheetConfig5e` is not used, inherit from `DocumentSheetConfig` instead.",
      { since: "DnD5e 6.0", until: "DnD5e 6.1" }
    );
    super(...args);
  }
}
