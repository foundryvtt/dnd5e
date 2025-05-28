import BastionSetting from "../../data/settings/bastion-setting.mjs";
import BaseSettingsConfig from "./base-settings.mjs";

/**
 * An application for configuring bastion settings.
 */
export default class BastionSettingsConfig extends BaseSettingsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    window: {
      title: "DND5E.Bastion.Configuration.Label"
    }
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    config: {
      template: "systems/dnd5e/templates/settings/bastion-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.fields = BastionSetting.schema.fields;
    context.source = game.settings.get("dnd5e", "bastionConfiguration");
    return context;
  }
}

export { BastionSetting };
