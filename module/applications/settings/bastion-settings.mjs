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

/* -------------------------------------------- */

const { BooleanField, NumberField } = foundry.data.fields;

/**
 * A data model that represents the Bastion configuration options.
 */
export class BastionSetting extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      button: new BooleanField({
        required: true, label: "DND5E.Bastion.Button.Label", hint: "DND5E.Bastion.Button.Hint"
      }),
      duration: new NumberField({
        required: true, positive: true, integer: true, initial: 7, label: "DND5E.Bastion.Duration.Label"
      }),
      enabled: new BooleanField({
        required: true, label: "DND5E.Bastion.Enabled.Label", hint: "DND5E.Bastion.Enabled.Hint"
      })
    };
  }
}
