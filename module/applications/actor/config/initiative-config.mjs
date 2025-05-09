import BaseConfigSheet from "../api/base-config-sheet.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Configuration application for an actor's initiative.
 */
export default class InitiativeConfig extends BaseConfigSheet {

  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 420
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/initiative-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.Initiative");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document._source;

    const defaultAbility = CONFIG.DND5E.abilities[CONFIG.DND5E.defaultAbilities.initiative];
    context.abilityOptions = [
      { value: "", label: game.i18n.format("DND5E.DefaultSpecific", { default: defaultAbility.label.toLowerCase() }) },
      { rule: true },
      ...Object.entries(CONFIG.DND5E.abilities).map(([value, { label }]) => ({ value, label }))
    ];
    context.data = source.system.attributes.init;
    context.fields = this.document.system.schema.fields.attributes.fields.init.fields;

    const ability = this.document.system.attributes.init.ability || CONFIG.DND5E.defaultAbilities.initiative;
    const abilityConfig = CONFIG.DND5E.abilities[ability];
    context.ability = {
      label: game.i18n.format("DND5E.AbilityCheckConfigure", { ability: abilityConfig.label }),
      global: {
        field: this.document.system.schema.fields.bonuses.fields.abilities.fields.check,
        name: "system.bonuses.abilities.check",
        value: source.system.bonuses.abilities.check
      },
      local: {
        field: this.document.system.schema.fields.abilities.model.fields.bonuses.fields.check,
        name: `system.abilities.${ability}.bonuses.check`,
        value: source.system.abilities[ability]?.bonuses.check
      }
    };

    context.flags = {
      alert: {
        field: new BooleanField({ label: game.i18n.localize("DND5E.FlagsAlert") }),
        name: "flags.dnd5e.initiativeAlert",
        value: source.flags.dnd5e?.initiativeAlert
      }
    };

    return context;
  }
}
