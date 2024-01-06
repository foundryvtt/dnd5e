import SystemDataModel from "../../abstract.mjs";

/**
 * Data model template with information on physical items.
 *
 * @property {string} container           Container within which this item is located.
 * @property {number} quantity            Number of items in a stack.
 * @property {number} weight              Item's weight in pounds or kilograms (depending on system setting).
 * @property {object} price
 * @property {number} price.value         Item's cost in the specified denomination.
 * @property {string} price.denomination  Currency denomination used to determine price.
 * @property {string} rarity              Item rarity as defined in `DND5E.itemRarity`.
 * @mixin
 */
export default class PhysicalItemTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      container: new foundry.data.fields.ForeignDocumentField(foundry.documents.BaseItem, {
        idOnly: true, label: "DND5E.Container"
      }),
      quantity: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, initial: 1, min: 0, label: "DND5E.Quantity"
      }),
      weight: new foundry.data.fields.NumberField({
        required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Weight"
      }),
      price: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Price"
        }),
        denomination: new foundry.data.fields.StringField({
          required: true, blank: false, initial: "gp", label: "DND5E.Currency"
        })
      }, {label: "DND5E.Price"}),
      rarity: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.Rarity"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Maximum depth items can be nested in containers.
   * @type {number}
   */
  static MAX_DEPTH = 5;

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get a human-readable label for the price and denomination.
   * @type {string}
   */
  get priceLabel() {
    const { value, denomination } = this.price;
    const hasPrice = value && (denomination in CONFIG.DND5E.currencies);
    return hasPrice ? `${value} ${CONFIG.DND5E.currencies[denomination].label}` : null;
  }

  /* -------------------------------------------- */

  /**
   * The weight of all of the items in an item stack.
   * @type {number}
   */
  get totalWeight() {
    return this.quantity * this.weight;
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    PhysicalItemTemplate.#migratePrice(source);
    PhysicalItemTemplate.#migrateRarity(source);
    PhysicalItemTemplate.#migrateWeight(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the item's price from a single field to an object with currency.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migratePrice(source) {
    if ( !("price" in source) || foundry.utils.getType(source.price) === "Object" ) return;
    source.price = {
      value: Number.isNumeric(source.price) ? Number(source.price) : 0,
      denomination: "gp"
    };
  }

  /* -------------------------------------------- */

  /**
   * Migrate the item's rarity from freeform string to enum value.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateRarity(source) {
    if ( !("rarity" in source) || CONFIG.DND5E.itemRarity[source.rarity] ) return;
    source.rarity = Object.keys(CONFIG.DND5E.itemRarity).find(key =>
      CONFIG.DND5E.itemRarity[key].toLowerCase() === source.rarity.toLowerCase()
    ) ?? "";
  }

  /* -------------------------------------------- */

  /**
   * Convert null weights to 0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateWeight(source) {
    if ( !("weight" in source) ) return;
    if ( (source.weight === null) || (source.weight === undefined) ) source.weight = 0;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Trigger a render on all sheets for items within which this item is contained.
   * @param {object} [options={}]
   * @param {object} [options.rendering]        Additional rendering options.
   * @param {string} [options.formerContainer]  UUID of the former container if this item was moved.
   * @protected
   */
  async _renderContainers({ formerContainer, ...rendering }={}) {
    // Render this item's container & any containers it is within
    const parentContainers = await this.allContainers();
    parentContainers.forEach(c => c.sheet?.render(false, rendering));

    // Render the actor sheet, compendium, or sidebar
    if ( this.parent.isEmbedded ) this.parent.actor.sheet?.render(false, rendering);
    else if ( this.parent.pack ) game.packs.get(this.parent.pack).apps.forEach(a => a.render(false, rendering));
    else ui.sidebar.tabs.items.render(false, rendering);

    // Render former container if it was moved between containers
    if ( formerContainer ) {
      const former = await fromUuid(formerContainer);
      former.render(false, rendering);
      former.system._renderContainers(rendering);
    }
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onCreate(data, options, userId) {
    this._renderContainers();
    if ( userId === game.user.id ) this.parent.actor?.updateEncumbrance(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    this._renderContainers({ formerContainer: options.formerContainer });
    if ( userId === game.user.id ) this.parent.actor?.updateEncumbrance(options);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    this._renderContainers();
    if ( userId === game.user.id ) this.parent.actor?.updateEncumbrance(options);
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * All of the containers this item is within up to the parent actor or collection.
   * @returns {Promise<Item5e[]>}
   */
  async allContainers() {
    let item = this.parent;
    let container;
    let depth = 0;
    const containers = [];
    while ( (container = await item.container) && (depth < PhysicalItemTemplate.MAX_DEPTH) ) {
      containers.push(container);
      item = container;
      depth++;
    }
    return containers;
  }
}
