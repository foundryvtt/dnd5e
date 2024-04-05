import { FormulaField } from "../../fields.mjs";

const { BooleanField, EmbeddedDataField, SchemaField, StringField } = foundry.data.fields;

/**
 * A field for storing summons data.
 */
export default class EnchantmentField extends EmbeddedDataField {
  /**
   * Construct an enchantment field.
   * @param {object} [options={}]  Options to configure this field's behavior.
   */
  constructor(options={}) {
    super(EnchantmentData, foundry.utils.mergeObject({ required: false, nullable: true, initial: null }, options));
  }
}

/**
 * Data model for enchantment configuration.
 *
 * @property {object} items
 * @property {string} items.max                   Maximum number of items that can have this enchantment.
 * @property {string} items.period                Frequently at which the enchantment be swapped.
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical  Allow enchantments to be applied to items that are already magical.
 * @property {string} restrictions.type           Item type to which this enchantment can be applied.
 */
export class EnchantmentData extends foundry.abstract.DataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      items: new SchemaField({
        max: new FormulaField({deterministic: true})
      }),
      restrictions: new SchemaField({
        allowMagical: new BooleanField(),
        type: new StringField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * List of item types that are enchantable.
   * @type {Set<string>}
   */
  static get enchantableTypes() {
    return Object.entries(CONFIG.Item.dataModels).reduce((set, [k, v]) => {
      if ( v.metadata?.enchantable ) set.add(k);
      return set;
    }, new Set());
  }

  /* -------------------------------------------- */

  /**
   * Is this feature an enchantment?
   * @param {FeatData} data  Data for the feature.
   * @returns {boolean}
   */
  static isEnchantment(data) {
    return (data.actionType === "ench") || (data.type?.value === "enchantment");
  }

  /**
   * Is this feature an enchantment?
   * @type {boolean}
   */
  get isEnchantment() {
    return EnchantmentData.isEnchantment(this.parent);
  }

  /* -------------------------------------------- */

  /**
   * Does this feature represent a group of individual enchantments (e.g. the "Infuse Item" feature stores data about
   * all of the character's infusions).
   * @param {FeatData} data  Data for the feature.
   * @returns {boolean}
   */
  static isEnchantmentSource(data) {
    return !this.isEnchantment(data)
      && CONFIG.DND5E.featureTypes[data.type?.value]?.subtypes?.[data.type?.subtype]
      && (data.type?.subtype in CONFIG.DND5E.featureTypes.enchantment.subtypes);
  }

  /**
   * Does this feature represent a group of individual enchantments (e.g. the "Infuse Item" feature stores data about
   * all of the character's infusions).
   * @type {boolean}
   */
  get isEnchantmentSource() {
    return EnchantmentData.isEnchantmentSource(this.parent);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Determine whether the provided item can be enchanted based on this enchantment's restrictions.
   * @param {Item5e} item  Item that might be enchanted.
   * @returns {true|EnchantmentError[]}
   */
  canEnchant(item) {
    const errors = [];

    if ( !this.restrictions.allowMagical && item.system.properties?.has("mgc") ) {
      errors.push(new EnchantmentError(game.i18n.localize("DND5E.Enchantment.Warning.NoMagicalItems")));
    }

    if ( this.restrictions.type && (item.type !== this.restrictions.type) ) {
      errors.push(new EnchantmentError(game.i18n.format("DND5E.Enchantment.Warning.WrongType", {
        incorrectType: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
        allowedType: game.i18n.localize(CONFIG.Item.typeLabels[this.restrictions.type])
      })));
    }

    return errors.length ? errors : true;
  }
}

/**
 * Error to throw when an item cannot be enchanted.
 */
export class EnchantmentError extends Error {
  constructor(...args) {
    super(...args);
    this.name = "EnchantmentError";
  }
}
