import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for item choices.
 */
export default class ItemChoiceConfig extends AdvancementConfig {

  /** @inheritDoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "advancement", "item-choice", "two-column"],
      dragDrop: [{ dropSelector: ".drop-target" }],
      dropKeyPath: "pool",
      template: "systems/dnd5e/templates/advancement/item-choice-config.hbs",
      width: 540
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getData(options={}) {
    const indexes = this.advancement.configuration.pool.map(i => fromUuidSync(i.uuid));
    const context = {
      ...super.getData(options),
      abilities: Object.entries(CONFIG.DND5E.abilities).reduce((obj, [k, c]) => {
        obj[k] = { label: c.label, selected: this.advancement.configuration.spell?.ability.has(k) ? "selected" : "" };
        return obj;
      }, {}),
      showContainerWarning: indexes.some(i => i?.type === "container"),
      showSpellConfig: this.advancement.configuration.type === "spell",
      validTypes: this.advancement.constructor.VALID_TYPES.reduce((obj, type) => {
        obj[type] = game.i18n.localize(CONFIG.Item.typeLabels[type]);
        return obj;
      }, {})
    };
    if ( this.advancement.configuration.type === "feat" ) {
      const selectedType = CONFIG.DND5E.featureTypes[this.advancement.configuration.restriction.type];
      context.typeRestriction = {
        typeLabel: game.i18n.localize("DND5E.ItemFeatureType"),
        typeOptions: CONFIG.DND5E.featureTypes,
        subtypeLabel: game.i18n.format("DND5E.ItemFeatureSubtype", {category: selectedType?.label}),
        subtypeOptions: selectedType?.subtypes
      };
    }
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async prepareConfigurationUpdate(configuration) {
    if ( configuration.choices ) configuration.choices = this.constructor._cleanedObject(configuration.choices);
    if ( configuration.spell ) configuration.spell.ability ??= [];

    // Ensure items are still valid if type restriction or spell restriction are changed
    const pool = [];
    for ( const item of (configuration.pool ?? this.advancement.configuration.pool) ) {
      if ( this.advancement._validateItemType(await fromUuid(item.uuid), {
        type: configuration.type, restriction: configuration.restriction ?? {}, strict: false
      }) ) pool.push(item);
    }
    configuration.pool = pool;

    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _validateDroppedItem(event, item) {
    this.advancement._validateItemType(item);
  }
}
