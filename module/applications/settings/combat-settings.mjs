import BaseSettingsConfig from "./base-settings.mjs";

/**
 * An application for configuring combat settings.
 */
export default class CombatSettingsConfig extends BaseSettingsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    window: {
      title: "SETTINGS.DND5E.COMBAT.Label"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    initiative: {
      template: "systems/dnd5e/templates/settings/base-config.hbs"
    },
    criticals: {
      template: "systems/dnd5e/templates/settings/base-config.hbs"
    },
    npcs: {
      template: "systems/dnd5e/templates/settings/base-config.hbs"
    },
    footer: {
      template: "templates/generic/form-footer.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "initiative":
        context.fields = [
          this.createSettingField("initiativeDexTiebreaker"),
          this.createSettingField("initiativeScore")
        ];
        context.legend = game.i18n.localize("DND5E.Initiative");
        break;
      case "criticals":
        context.fields = [
          this.createSettingField("criticalDamageModifiers"),
          this.createSettingField("criticalDamageMaxDice")
        ];
        context.legend = game.i18n.localize("SETTINGS.DND5E.CRITICAL.Name");
        break;
      case "npcs":
        context.fields = [
          this.createSettingField("autoRecharge"),
          this.createSettingField("autoRollNPCHP")
        ];
        context.legend = game.i18n.localize("SETTINGS.DND5E.NPCS.Name");
        break;
    }
    return context;
  }
}
