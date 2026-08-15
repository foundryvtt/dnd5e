import BaseProficiencyConfig from "./base-proficiency-config.mjs";

/**
 * Configuration application for an actor's abilities.
 */
export default class AbilityConfig extends BaseProficiencyConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    trait: "saves"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    config: {
      template: "systems/dnd5e/templates/actors/config/ability-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get propertyConfig() {
    return CONFIG.DND5E.abilities[this.options.key];
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.proficiencyOptions = [
      { value: 0, label: CONFIG.DND5E.proficiencyLevels[0] },
      { value: 1, label: CONFIG.DND5E.proficiencyLevels[1] }
    ];
    context.rollSections = ["attack", "check", "save"].map(type => ({
      data: context.data[type]?.roll ?? {},
      fields: context.fields[type].fields.roll.fields,
      label: _loc(`DND5E.ABILITY.Configure.${type.capitalize()}Label`, { ability: context.label }),
      prefix: `${context.prefix}${type}.roll.`
    }));
    return context;
  }
}
