import AdvancementConfig from "./advancement-config-v2.mjs";

/**
 * Configuration application for item grants.
 */
export default class ItemGrantConfig extends AdvancementConfig {
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
    }));

    context.abilityOptions = Object.entries(CONFIG.DND5E.abilities).map(([value, { label }]) => ({ value, label }));
    context.showContainerWarning = context.items.some(i => i.index?.type === "container");
    context.showSpellConfig = context.items.some(i => i.index?.type === "spell");

    const { spell } = this.advancement.configuration;
    const model = CONFIG.DND5E.spellcasting[spell?.method];
    context.showRequireSpellSlot = !spell?.method || model?.slots;
    context.canPrepare = model?.prepares;
    context.spellcastingMethods = Object.values(CONFIG.DND5E.spellcasting).map(({ key, label }) => {
      return { label, value: key };
    });
    if ( spell?.method && !(spell.method in CONFIG.DND5E.spellcasting) ) {
      context.spellcastingMethods.push({ label: spell.method, value: spell.method });
    }

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

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _validateDroppedItem(event, item) {
    this.advancement._validateItemType(item);
  }
}
