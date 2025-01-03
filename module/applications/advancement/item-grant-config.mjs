import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for item grants.
 */
export default class ItemGrantConfig extends AdvancementConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "item-grant"],
      dragDrop: [{ dropSelector: ".drop-target" }],
      dropKeyPath: "items",
      template: "systems/dnd5e/templates/advancement/item-grant-config.hbs"
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options={}) {
    const context = super.getData(options);
    const indexes = context.configuration.items.map(i => fromUuidSync(i.uuid));
    context.abilities = Object.entries(CONFIG.DND5E.abilities).reduce((obj, [k, c]) => {
      obj[k] = { label: c.label, selected: context.configuration.spell?.ability.has(k) ? "selected" : "" };
      return obj;
    }, {});
    const config = CONFIG.DND5E.spellcasting[this.advancement.configuration.spell?.preparation];
    context.showContainerWarning = indexes.some(i => i?.type === "container");
    context.showSpellConfig = indexes.some(i => i?.type === "spell");
    context.showRequireSpellSlot = !this.advancement.configuration.spell?.preparation || !config?.static;
    context.showPreparationState = context.showSpellConfig && config?.prepares;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration) {
    if ( configuration.spell ) configuration.spell.ability ??= [];
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _validateDroppedItem(event, item) {
    this.advancement._validateItemType(item);
  }
}
