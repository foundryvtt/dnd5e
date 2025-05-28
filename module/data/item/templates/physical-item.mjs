import { convertWeight, defaultUnits } from "../../../utils.mjs";
import SystemDataModel from "../../abstract/system-data-model.mjs";

const { ForeignDocumentField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model template with information on physical items.
 *
 * @property {string} container           Container within which this item is located.
 * @property {number} quantity            Number of items in a stack.
 * @property {object} weight
 * @property {number} weight.value        Item's weight.
 * @property {string} weight.units        Units used to measure the weight.
 * @property {object} price
 * @property {number} price.value         Item's cost in the specified denomination.
 * @property {string} price.denomination  Currency denomination used to determine price.
 * @property {string} rarity              Item rarity as defined in `DND5E.itemRarity`.
 * @mixin
 */
export default class PhysicalItemTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      container: new ForeignDocumentField(foundry.documents.BaseItem, {
        idOnly: true, label: "DND5E.Container"
      }),
      quantity: new NumberField({
        required: true, nullable: false, integer: true, initial: 1, min: 0, label: "DND5E.Quantity"
      }),
      weight: new SchemaField({
        value: new NumberField({
          required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Weight"
        }),
        units: new StringField({
          required: true, blank: false, label: "DND5E.UNITS.WEIGHT.Label", initial: () => defaultUnits("weight")
        })
      }, {label: "DND5E.Weight"}),
      price: new SchemaField({
        value: new NumberField({
          required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Price"
        }),
        denomination: new StringField({
          required: true, blank: false, initial: "gp", label: "DND5E.Currency"
        })
      }, {label: "DND5E.Price"}),
      rarity: new StringField({required: true, blank: true, label: "DND5E.Rarity"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Maximum depth items can be nested in containers.
   * @type {number}
   */
  static MAX_DEPTH = 5;

  /* -------------------------------------------- */

  /**
   * Create filter configurations shared by all physical items.
   * @returns {[string, CompendiumBrowserFilterDefinitionEntry][]}
   */
  static get compendiumBrowserPhysicalItemFilters() {
    return [
      ["price", {
        label: "DND5E.Price",
        type: "range",
        config: {
          keyPath: "system.price.value"
        }
      }],
      ["rarity", {
        label: "DND5E.Rarity",
        type: "set",
        config: {
          blank: game.i18n.localize("DND5E.ItemRarityMundane").capitalize(),
          choices: Object.entries(CONFIG.DND5E.itemRarity).reduce((obj, [key, label]) => {
            obj[key] = { label: label.capitalize() };
            return obj;
          }, {}),
          keyPath: "system.rarity"
        }
      }]
    ];
  }

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
    return this.quantity * this.weight.value;
  }

  /* -------------------------------------------- */

  /**
   * Field specifications for physical items.
   * @type {object[]}
   */
  get physicalItemSheetFields() {
    return [{
      label: CONFIG.DND5E.itemRarity[this.rarity],
      value: this._source.rarity,
      requiresIdentification: true,
      field: this.schema.getField("rarity"),
      choices: CONFIG.DND5E.itemRarity,
      blank: "DND5E.Rarity",
      classes: "item-rarity"
    }];
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare physical item properties.
   */
  preparePhysicalData() {
    if ( !("gp" in CONFIG.DND5E.currencies) ) return;
    const { value, denomination } = this.price;
    const { conversion } = CONFIG.DND5E.currencies[denomination] ?? {};
    const { gp } = CONFIG.DND5E.currencies;
    if ( conversion ) {
      const multiplier = gp.conversion / conversion;
      this.price.valueInGP = Math.floor(value * multiplier);
    }
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
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
   * Migrate the item's weight from a single field to an object with units & convert null weights to 0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateWeight(source) {
    if ( !("weight" in source) || (foundry.utils.getType(source.weight) === "Object") ) return;
    source.weight = {
      value: Number.isNumeric(source.weight) ? Number(source.weight) : 0,
      units: defaultUnits("weight")
    };
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
    parentContainers.forEach(c => {
      if ( c.sheet?.rendered ) c.sheet?.render(false, { ...rendering });
    });
    if ( !parentContainers.length && !formerContainer ) return;

    // Render the actor sheet, compendium, or sidebar
    if ( this.parent.isEmbedded && this.parent.actor.sheet?.rendered ) {
      this.parent.actor.sheet.render(false, { ...rendering });
    }
    else if ( this.parent.pack ) game.packs.get(this.parent.pack).apps.forEach(a => a.render(false, { ...rendering }));
    else ui.items.render(false, { ...rendering });

    // Render former container if it was moved between containers
    if ( formerContainer ) {
      const former = await fromUuid(formerContainer);
      former.render(false, { ...rendering });
      former.system._renderContainers(rendering);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( await super._preUpdate(changed, options, user) === false ) return false;
    if ( foundry.utils.hasProperty(changed, "system.container") ) {
      options.formerContainer = (await this.parent.container)?.uuid;
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    if ( options.render !== false ) this._renderContainers();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if ( options.render !== false ) this._renderContainers({ formerContainer: options.formerContainer });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( options.render !== false ) this._renderContainers();
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

  /* -------------------------------------------- */

  /**
   * Calculate the total weight and return it in specific units.
   * @param {string} units  Units in which the weight should be returned.
   * @returns {number|Promise<number>}
   */
  totalWeightIn(units) {
    const weight = this.totalWeight;
    if ( weight instanceof Promise ) return weight.then(w => convertWeight(w, this.weight.units, units));
    return convertWeight(weight, this.weight.units, units);
  }
}
