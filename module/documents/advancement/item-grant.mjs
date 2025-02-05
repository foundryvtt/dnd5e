import { filteredKeys } from "../../utils.mjs";
import ItemGrantConfig from "../../applications/advancement/item-grant-config.mjs";
import ItemGrantFlow from "../../applications/advancement/item-grant-flow.mjs";
import ItemGrantConfigurationData from "../../data/advancement/item-grant.mjs";
import Advancement from "./advancement.mjs";

/**
 * Advancement that automatically grants one or more items to the player. Presents the player with the option of
 * skipping any or all of the items.
 */
export default class ItemGrantAdvancement extends Advancement {

  /** @inheritDoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      dataModels: {
        configuration: ItemGrantConfigurationData
      },
      order: 40,
      icon: "icons/sundries/books/book-open-purple.webp",
      typeIcon: "systems/dnd5e/icons/svg/item-grant.svg",
      title: game.i18n.localize("DND5E.ADVANCEMENT.ItemGrant.Title"),
      hint: game.i18n.localize("DND5E.ADVANCEMENT.ItemGrant.Hint"),
      apps: {
        config: ItemGrantConfig,
        flow: ItemGrantFlow
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * The item types that are supported in Item Grant.
   * @type {Set<string>}
   */
  static VALID_TYPES = new Set(["feat", "spell", "consumable", "container", "equipment", "loot", "tool", "weapon"]);

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  configuredForLevel(level) {
    return !foundry.utils.isEmpty(this.value);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  summaryForLevel(level, { configMode=false }={}) {
    // Link to compendium items
    if ( !this.value.added || configMode ) return this.configuration.items.filter(i => fromUuidSync(i.uuid))
      .reduce((html, i) => html + dnd5e.utils.linkForUuid(i.uuid), "");

    // Link to items on the actor
    else {
      return Object.keys(this.value.added).map(id => {
        const item = this.actor.items.get(id);
        return item?.toAnchor({classes: ["content-link"]}).outerHTML ?? "";
      }).join("");
    }
  }

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  /**
   * Location where the added items are stored for the specified level.
   * @param {number} level  Level being advanced.
   * @returns {string}
   */
  storagePath(level) {
    return "value.added";
  }

  /* -------------------------------------------- */

  /**
   * Locally apply this advancement to the actor.
   * @param {number} level              Level being advanced.
   * @param {object} data               Data from the advancement form.
   * @param {object} [retainedData={}]  Item data grouped by UUID. If present, this data will be used rather than
   *                                    fetching new data from the source.
   * @returns {object}
   */
  async apply(level, data, retainedData={}) {
    const items = [];
    const updates = {};
    for ( const uuid of filteredKeys(data) ) {
      let itemData = retainedData[uuid];
      if ( !itemData ) {
        itemData = await this.createItemData(uuid);
        if ( !itemData ) continue;
      }
      if ( itemData.type === "spell" ) this.configuration.spell?.applySpellChanges(itemData, {
        ability: data.ability ?? this.retainedData?.ability ?? this.value?.ability
      });

      items.push(itemData);
      updates[itemData._id] = uuid;
    }
    if ( items.length ) {
      this.actor.updateSource({ items });
      this.updateSource({
        "value.ability": data.ability,
        [this.storagePath(level)]: updates
      });
    }
    return updates;
  }

  /* -------------------------------------------- */

  /** @override */
  automaticApplicationValue(level) {
    if ( this.configuration.optional
      || (this.configuration.spell?.ability?.size > 1)
      || this.configuration.items.some(i => i.optional) ) return false;
    return Object.fromEntries(this.configuration.items.map(({ uuid }) => [uuid, true]));
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data) {
    const updates = {};
    for ( const item of data.items ) {
      this.actor.updateSource({items: [item]});
      updates[item._id] = item.flags.dnd5e.sourceId;
    }
    this.updateSource({
      "value.ability": data.ability,
      [this.storagePath(level)]: updates
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  reverse(level) {
    const items = [];
    const keyPath = this.storagePath(level);
    for ( const id of Object.keys(foundry.utils.getProperty(this, keyPath) ?? {}) ) {
      const item = this.actor.items.get(id);
      if ( item ) items.push(item.toObject());
      this.actor.items.delete(id);
    }
    this.updateSource({[keyPath.replace(/\.([\w\d]+)$/, ".-=$1")]: null});
    return { ability: this.value?.ability, items };
  }

  /* -------------------------------------------- */

  /**
   * Verify that the provided item can be used with this advancement based on the configuration.
   * @param {Item5e} item                   Item that needs to be tested.
   * @param {object} config
   * @param {boolean} [config.strict=true]  Should an error be thrown when an invalid type is encountered?
   * @returns {boolean}                     Is this type valid?
   * @throws {Error}                        An error if the item is invalid and strict is `true`.
   */
  _validateItemType(item, { strict=true }={}) {
    if ( !item ) return false;
    if ( this.constructor.VALID_TYPES.has(item.type) ) return true;
    const type = game.i18n.localize(CONFIG.Item.typeLabels[item.type]);
    if ( strict ) throw new Error(game.i18n.format("DND5E.AdvancementItemTypeInvalidWarning", {type}));
    return false;
  }
}
