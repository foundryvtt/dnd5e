import Advancement from "./advancement.mjs";
import ItemChoiceConfig from "../../applications/advancement/item-choice-config.mjs";
import ItemChoiceFlow from "../../applications/advancement/item-choice-flow.mjs";
import ItemChoiceConfigurationData from "../../data/advancement/item-choice.mjs";

/**
 * Advancement that presents the player with a choice of multiple items that they can take. Keeps track of which
 * items were selected at which levels.
 */
export default class ItemChoiceAdvancement extends Advancement {

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ItemChoiceConfigurationData
      },
      order: 50,
      icon: "systems/dnd5e/icons/svg/item-choice.svg",
      title: game.i18n.localize("DND5E.AdvancementItemChoiceTitle"),
      hint: game.i18n.localize("DND5E.AdvancementItemChoiceHint"),
      multiLevel: true,
      apps: {
        config: ItemChoiceConfig,
        flow: ItemChoiceFlow
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * The item types that are supported in Item Choice. This order will be how they are displayed
   * in the configuration interface.
   * @type {Set<string>}
   */
  static VALID_TYPES = new Set(["feat", "spell", "consumable", "backpack", "equipment", "loot", "tool", "weapon"]);

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Array.from(Object.keys(this.configuration.choices));
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  configuredForLevel(level) {
    return this.value[level] !== undefined;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  titleForLevel(level) {
    return `${this.title} <em>(${game.i18n.localize("DND5E.AdvancementChoices")})</em>`;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  summaryForLevel(level) {
    const items = this.value[level];
    if ( !items ) return "";
    return Object.values(items).reduce((html, uuid) => html + game.dnd5e.utils.linkForUuid(uuid), "");
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Locally apply this advancement to the actor.
   * @param {number} level              Level being advanced.
   * @param {object} data               Data from the advancement form.
   * @param {object} [retainedData={}]  Item data grouped by UUID. If present, this data will be used rather than
   *                                    fetching new data from the source.
   */
  async apply(level, data, retainedData={}) {
    const items = [];
    const updates = {};
    const spellChanges = this.configuration.spell?.spellChanges ?? {};
    for ( const [uuid, selected] of Object.entries(data) ) {
      if ( !selected ) continue;

      let itemData = retainedData[uuid];
      if ( !itemData ) {
        const source = await fromUuid(uuid);
        if ( !source ) continue;
        itemData = source.clone({
          _id: foundry.utils.randomID(),
          "flags.dnd5e.sourceId": uuid,
          "flags.dnd5e.advancementOrigin": `${this.item.id}.${this.id}`
        }, {keepId: true}).toObject();
      }
      foundry.utils.mergeObject(itemData, spellChanges);

      items.push(itemData);
      updates[itemData._id] = uuid;
    }
    this.actor.updateSource({items});
    this.updateSource({[`value.${level}`]: updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  restore(level, data) {
    const updates = {};
    for ( const item of data.items ) {
      this.actor.updateSource({items: [item]});
      updates[item._id] = item.flags.dnd5e.sourceId;
    }
    this.updateSource({[`value.${level}`]: updates});
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  reverse(level) {
    const items = [];
    for ( const id of Object.keys(this.value[level] ?? {}) ) {
      const item = this.actor.items.get(id);
      if ( item ) items.push(item.toObject());
      this.actor.items.delete(id);
    }
    this.updateSource({[`value.-=${level}`]: null });
    return { items };
  }

  /* -------------------------------------------- */

  /**
   * Verify that the provided item can be used with this advancement based on the configuration.
   * @param {Item5e} item                  Item that needs to be tested.
   * @param {object} config
   * @param {string} config.restriction    Type restriction on this advancement.
   * @param {string} config.spellLevel     Spell level limitation.
   * @param {boolean} [config.error=true]  Should an error be thrown when an invalid type is encountered?
   * @returns {boolean}                    Is this type valid?
   * @throws An error if the item is invalid and warn is `true`.
   */
  _verifyItemType(item, { restriction, spellLevel, error=true }={}) {
    restriction ??= this.configuration.type;
    spellLevel ??= this.configuration.spell?.level;

    // Type restriction is set and the item type does not match the selected type
    if ( restriction && (restriction !== item.type) ) {
      const type = game.i18n.localize(`ITEM.Type${restriction.capitalize()}`);
      if ( error ) throw new Error(game.i18n.format("DND5E.AdvancementItemChoiceTypeWarning", { type }));
      return false;
    }

    // Item is not one of the valid types
    if ( !this.constructor.VALID_TYPES.has(item.type) ) {
      const type = game.i18n.localize(`ITEM.Type${item.type.capitalize()}`);
      if ( error ) throw new Error(game.i18n.format("DND5E.AdvancementItemTypeInvalidWarning", { type }));
      return false;
    }

    // If spell level is restricted, ensure the spell is of the appropriate level
    const l = parseInt(spellLevel);
    if ( (restriction === "spell") && Number.isNumeric(l) && (item.system.level !== l) ) {
      const level = CONFIG.DND5E.spellLevels[l];
      if ( error ) throw new Error(game.i18n.format("DND5E.AdvancementItemChoiceSpellLevelSpecificWarning", { level }));
      return false;
    }

    return true;
  }
}
