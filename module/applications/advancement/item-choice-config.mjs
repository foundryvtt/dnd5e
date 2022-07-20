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
  async prepareConfigurationUpdate(configuration) {
    if ( configuration.choices ) configuration.choices = this.constructor._cleanedObject(configuration.choices);

    // Ensure items are still valid if type restriction or spell restriction are changed
    configuration.pool ??= this.advancement.data.configuration.pool;
    configuration.pool = await configuration.pool.reduce(async (pool, uuid) => {
      const item = await fromUuid(uuid);
      if ( this.advancement._verifyItemType(item, {
        restriction: configuration.type, spellLevel: configuration.spell?.level ?? false, error: false
      }) ) return [...await pool, uuid];
      return pool;
    }, []);

    return configuration;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _verifyDroppedItem(event, item) {
    this.advancement._verifyItemType(item);
  }
}
