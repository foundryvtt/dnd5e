import BaseSettingsConfig from "./base-settings.mjs";

/**
 * An application for configuring player visibility settings.
 */
export default class VisibilitySettingsConfig extends BaseSettingsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    window: {
      title: "SETTINGS.DND5E.VISIBILITY.Label"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.fields = [
      this.createSettingField("challengeVisibility"),
      this.createSettingField("attackRollVisibility"),
      this.createSettingField("bloodied"),
      this.createSettingField("concealItemDescriptions")
    ];
    return context;
  }
}
