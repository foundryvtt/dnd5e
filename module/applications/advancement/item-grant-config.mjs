import ItemSharedConfig from "./item-shared-config.mjs";

/**
 * Configuration application for item grants.
 */
export default class ItemGrantConfig extends ItemSharedConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["item-grant"],
    dropKeyPath: "items"
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    details: {
      template: "systems/dnd5e/templates/advancement/item-grant-config-details.hbs"
    },
    spellConfig: {
      template: "systems/dnd5e/templates/advancement/advancement-spell-config-section.hbs"
    },
    items: {
      template: "systems/dnd5e/templates/advancement/item-grant-config-items.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.items = this.advancement.configuration.items.map(data => ({
      data,
      fields: this.advancement.configuration.schema.fields.items.element.fields,
      index: fromUuidSync(data.uuid)
    })).sort((lhs, rhs) => context.manualSort
      ? lhs.data.sort - rhs.data.sort
      : lhs.index.name.localeCompare(rhs.index.name));

    context.abilityOptions = Object.entries(CONFIG.DND5E.abilities).map(([value, { label }]) => ({ value, label }));
    context.showContainerWarning = context.items.some(i => i.index?.type === "container");
    context.showSpellConfig = context.items.some(i => i.index?.type === "spell");
    context.showRequireSpellSlot = !this.advancement.configuration.spell?.preparation
      || CONFIG.DND5E.spellPreparationModes[this.advancement.configuration.spell?.preparation]?.upcast;

    return context;
  }

  /* -------------------------------------------- */
  /*  Form Handling                               */
  /* -------------------------------------------- */

  /** @override */
  async prepareConfigurationUpdate(configuration) {
    if ( configuration.spell ) configuration.spell.ability ??= [];
    return configuration;
  }
}
