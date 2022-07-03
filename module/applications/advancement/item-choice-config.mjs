import AdvancementConfig from "./advancement-config.mjs";

/**
 * Configuration application for item choices.
 */
export default class ItemChoiceConfig extends AdvancementConfig {

  /** @inheritdoc */
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

  getData() {
    const data = { ...super.getData(), validTypes: {} };
    for ( const type of this.advancement.constructor.VALID_TYPES ) {
      data.validTypes[type] = game.i18n.localize(`ITEM.Type${type.capitalize()}`);
    }
    data.showSpellConfig = this.advancement.data.configuration.type === "spell";
    return data;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareConfigurationUpdate(configuration) {
    if ( configuration.choices ) configuration.choices = this.constructor._cleanedObject(configuration.choices);
    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _verifyDroppedItem(event, item) {
    const type = this.advancement.data.configuration.type;
    if ( !type || (type === item.type) ) return;
    const typeName = game.i18n.localize(`ITEM.Type${type.capitalize()}`);
    throw new Error(game.i18n.format("DND5E.AdvancementItemChoiceTypeWarning", { type: typeName }));
  }
}
