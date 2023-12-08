import SystemDataModel from "../abstract.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import CurrencyTemplate from "../shared/currency.mjs";


/**
 * Data definition for Container items.
 * @mixes ItemDescriptionTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes CurrencyTemplate
 *
 * @property {object} capacity              Information on container's carrying capacity.
 * @property {string} capacity.type         Method for tracking max capacity as defined in `DND5E.itemCapacityTypes`.
 * @property {number} capacity.value        Total amount of the type this container can carry.
 * @property {boolean} capacity.weightless  Does the weight of the items in the container carry over to the actor?
 */
export default class ContainerData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, PhysicalItemTemplate, EquippableItemTemplate, CurrencyTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      quantity: new foundry.data.fields.NumberField({min: 1, max: 1}),
      capacity: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({
          required: true, initial: "weight", blank: false, label: "DND5E.ItemContainerCapacityType"
        }),
        value: new foundry.data.fields.NumberField({
          required: true, min: 0, label: "DND5E.ItemContainerCapacityMax"
        }),
        weightless: new foundry.data.fields.BooleanField({required: true, label: "DND5E.ItemContainerWeightless"})
      }, {label: "DND5E.ItemContainerCapacity"})
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ContainerData.#migrateQuantity(source);
  }

  /* -------------------------------------------- */

  /**
   * Force quantity to always be 1.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateQuantity(source) {
    source.quantity = 1;
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get all of the items contained in this container. A promise if item is within a compendium.
   * @type {Collection<Item5e>|Promise<Collection<Item5e>>}
   */
  get contents() {
    if ( !this.parent ) return new foundry.utils.Collection();

    // If in a compendium, fetch using getDocuments and return a promise
    if ( this.parent.pack && !this.parent.isEmbedded ) {
      const pack = game.packs.get(this.parent.pack);
      return pack.getDocuments({system: { container: this.parent.id }}).then(d =>
        new foundry.utils.Collection(d.map(d => [d.id, d]))
      );
    }

    // Otherwise use local document collection
    return (this.parent.isEmbedded ? this.parent.actor.items : game.items).reduce((collection, item) => {
      if ( item.system.container === this.parent.id ) collection.set(item.id, item);
      return collection;
    }, new foundry.utils.Collection());
  }

  /* -------------------------------------------- */

  /**
   * Get all of the items in this container and any sub-containers. A promise if item is within a compendium.
   * @type {Collection<Item5e>|Promise<Collection<Item5e>>}
   */
  get allContainedItems() {
    if ( !this.parent ) return new foundry.utils.Collection();
    if ( this.parent.pack ) return this.#allContainedItems();

    return this.contents.reduce((collection, item) => {
      collection.set(item.id, item);
      if ( item.type === "container" ) item.system.allContainedItems.forEach(i => collection.set(i.id, i));
      return collection;
    }, new foundry.utils.Collection());
  }

  /**
   * Asynchronous helper method for fetching all contained items from a compendium.
   * @returns {Promise<Collection<Item5e>>}
   * @private
   */
  async #allContainedItems() {
    return (await this.contents).reduce(async (promise, item) => {
      const collection = await promise;
      collection.set(item.id, item);
      if ( item.type === "container" ) (await item.system.allContainedItems).forEach(i => collection.set(i.id, i));
      return collection;
    }, new foundry.utils.Collection());
  }

  /* -------------------------------------------- */

  /**
   * Fetch a specific contained item.
   * @param {string} id                 ID of the item to fetch.
   * @returns {Item5e|Promise<Item5e>}  Item if found.
   */
  getContainedItem(id) {
    if ( this.parent?.isEmbedded ) return this.parent.actor.items.get(id);
    if ( this.parent?.pack ) return game.packs.get(this.parent.pack)?.getDocument(id);
    return game.items.get(id);
  }

  /* -------------------------------------------- */

  /**
   * Number of items contained in this container including items in sub-containers. Result is a promise if item
   * is within a compendium.
   * @type {number|Promise<number>}
   */
  get contentsCount() {
    const reducer = (count, item) => count + item.system.quantity;
    const items = this.allContainedItems;
    if ( items instanceof Promise ) return items.then(items => items.reduce(reducer, 0));
    return items.reduce(reducer, 0);
  }

  /* -------------------------------------------- */

  /**
   * Weight of the items in this container. Result is a promise if item is within a compendium.
   * @type {number|Promise<number>}
   */
  get contentsWeight() {
    if ( this.parent?.pack && !this.parent?.isEmbedded ) return this.#contentsWeight();
    return this.contents.reduce((weight, item) => weight + item.system.totalWeight, this.currencyWeight);
  }

  /**
   * Asynchronous helper method for calculating the weight of items in a compendium.
   * @returns {Promise<number>}
   */
  async #contentsWeight() {
    const contents = await this.contents;
    return contents.reduce(async (weight, item) => await weight + await item.system.totalWeight, this.currencyWeight);
  }

  /* -------------------------------------------- */

  /**
   * The weight of this container with all of its contents. Result is a promise if item is within a compendium.
   * @type {number|Promise<number>}
   */
  get totalWeight() {
    if ( this.capacity.weightless ) return this.weight;
    const containedWeight = this.contentsWeight;
    if ( containedWeight instanceof Promise ) return containedWeight.then(c => this.weight + c);
    return this.weight + containedWeight;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onUpdate(changed, options, userId) {
    // Keep contents folder synchronized with container
    if ( (game.user.id === userId) && foundry.utils.hasProperty(changed, "folder") ) {
      const contents = await this.contents;
      await Item.updateDocuments(contents.map(c => ({ _id: c.id, folder: changed.folder })), {
        parent: this.parent.parent, pack: this.parent.pack, ...options, render: false
      });
    }

    super._onUpdate(changed, options, userId);
  }
}
