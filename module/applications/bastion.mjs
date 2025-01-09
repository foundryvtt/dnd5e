import {default as BastionSettingsConfig} from "./settings/bastion-settings.mjs";

export default class BastionConfig extends BastionSettingsConfig {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning(
      "The `BastionConfig` application has been deprecated and replaced with `BastionSettingsConfig`.",
      { since: "DnD5e 4.2", until: "DnD5e 4.4" }
    );
    super(...args);
  }
}
