import { filteredKeys } from "../../utils.mjs";
import ItemGrantConfig from "../../applications/advancement/item-grant-config.mjs";
import ItemGrantFlow from "../../applications/advancement/item-grant-flow-v2.mjs";
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
   * @typedef ItemGrantAdvancementApplicationData
   * @property {string} [ability]     Selected ability for added spells.
   * @property {object} [items]       Retained item data grouped by UUID. If present, this data will be used rather than
   *                                  fetching new data from the source.
   * @property {string[]} [selected]  UUIDs of items to add. If none provided, then will fall back to the items provided
   *                                  in the `items` object.
   */

  /** @override */
  async apply(level, { ability, items: retainedData={}, selected=Object.keys(retainedData), ...data }={}, options={}) {
    if ( data ) {
      foundry.utils.logCompatibilityWarning(
        "The properties passed to `ItemGrantAdvancement#apply` have changed, see `ItemGrantAdvancementApplicationData` for new properties.",
        { since: "DnD5e 5.2", until: "DnD5e 5.4" }
      );
      selected = filteredKeys(data);
      retainedData = options;
    }

    if ( options.initial ) {
      ability = this.configuration.spell?.ability?.first();
      selected = this.configuration.items?.reduce((arr, { optional, uuid }) => {
        if ( !this.configuration.optional || !optional ) arr.push(uuid);
        return arr;
      }, []) ?? [];
    }

    if ( ability !== this.value?.ability ) {
      for ( const id of Object.keys(foundry.utils.getProperty(this, this.storagePath(level)) ?? {}) ) {
        const item = this.actor.items.get(id);
        if ( item?.type === "spell" ) item.updateSource({ "system.ability": ability });
      }
    }

    const items = [];
    const itemUpdates = {};
    for ( const uuid of selected ) {
      let itemData = retainedData[uuid];
      if ( !itemData ) {
        itemData = await this.createItemData(uuid);
        if ( !itemData ) continue;
      }
      if ( itemData.type === "spell" ) this.configuration.spell?.applySpellChanges(itemData, {
        ability: ability ?? this.value?.ability
      });

      items.push(itemData);
      itemUpdates[itemData._id] = uuid;
    }

    const updates = {};
    if ( ability ) updates["value.ability"] = ability;
    if ( items.length ) {
      this.actor.updateSource({ items });
      updates[this.storagePath(level)] = itemUpdates;
    }
    this.updateSource(updates);

    return updates;
  }

  /* -------------------------------------------- */

  /** @override */
  async automaticApplicationValue(level) {
    if ( this.configuration.optional
      || (this.configuration.spell?.ability?.size > 1)
      || this.configuration.items.some(i => i.optional) ) return false;
    return {
      ability: this.configuration.spell?.ability.first(),
      selected: this.configuration.items.map(({ uuid }) => uuid)
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  restore(level, data, options={}) {
    const updates = {};
    for ( const item of data.items ) {
      this.actor.updateSource({ items: [item] });
      updates[item._id] = item.flags.dnd5e.sourceId;
    }
    this.updateSource({
      "value.ability": data.ability,
      [this.storagePath(level)]: updates
    });
  }

  /* -------------------------------------------- */

  /**
   * @typedef {AdvancementReversalOptions} ItemGrantAdvancementReversalOptions
   * @property {string} [uuid]  UUID of a single item to remove.
   */

  /** @inheritDoc */
  reverse(level, options={}) {
    const keyPath = this.storagePath(level);
    const added = foundry.utils.getProperty(this.toObject(), keyPath) ?? {};
    let ids = options.uuid ? Object.entries(added).filter(([, v]) => v === options.uuid).map(([k]) => k)
      : Object.keys(added);
    if ( !ids.length ) return;

    const items = [];
    for ( const id of ids ) {
      const item = this.actor.items.get(id);
      if ( item ) items.push(item.toObject());
      this.actor.items.delete(id);
      added[`-=${id}`] = null;
    }

    if ( options.uuid ) this.updateSource({ [keyPath]: added });
    else this.updateSource({ [keyPath.replace(/\.([\w\d]+)$/, ".-=$1")]: null });
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
