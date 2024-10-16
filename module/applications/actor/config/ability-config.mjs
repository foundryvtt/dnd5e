import BaseConfigSheet from "../api/base-config-sheet.mjs";

/**
 * Configuration application for an actor's abilities.
 */
export default class AbilityConfig extends BaseConfigSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    ability: null,
    position: {
      width: 500
    }
  };

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/ability-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Configuration data for the ability being edited.
   * @type {AbilityConfiguration}
   */
  get abilityConfig() {
    return CONFIG.DND5E.abilities[this.options.ability];
  }

  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("DND5E.ABILITY.Configure.Title", { ability: this.abilityConfig?.label });
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const source = this.document.system._source;

    context.ability = this.abilityConfig?.label;
    context.data = source.abilities?.[this.options.ability] ?? {};
    context.fields = this.document.system.schema.fields.abilities.model.fields;
    context.prefix = `system.abilities.${this.options.ability}.`;
    context.proficiencyOptions = [
      { value: 0, label: CONFIG.DND5E.proficiencyLevels[0] },
      { value: 1, label: CONFIG.DND5E.proficiencyLevels[1] }
    ];

    if ( this.document.system.bonuses?.abilities ) context.global = {
      data: source.bonuses?.abilities ?? {},
      fields: this.document.system.schema.fields.bonuses.fields.abilities.fields
    };

    return context;
  }
}
