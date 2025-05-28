import TraitsConfig from "./traits-config.mjs";

/**
 * Configuration application for languages.
 */
export default class LanguagesConfig extends TraitsConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["languages"],
    trait: "languages"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    traits: {
      template: "systems/dnd5e/templates/actors/config/languages-config.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("DND5E.Languages");
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const unitOptions = Object.entries(CONFIG.DND5E.movementUnits).map(([value, { label }]) => ({ value, label }));
    context.communication = Object.entries(CONFIG.DND5E.communicationTypes).map(([key, { label }]) => ({
      label, unitOptions,
      data: context.data.communication[key],
      fields: context.fields.communication.model.fields,
      keyPath: `${context.keyPath}.communication.${key}`
    }));

    return context;
  }
}
