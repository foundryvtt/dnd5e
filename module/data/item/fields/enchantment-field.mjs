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
 * @property {string} items.period                Frequency at which the enchantment be swapped.
 * @property {boolean} prompt                     Should the player be prompted to apply an enchantment?
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical  Allow enchantments to be applied to items that are already magical.
 * @property {string} restrictions.type           Item type to which this enchantment can be applied.
 */
export class EnchantmentData extends foundry.abstract.DataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      items: new SchemaField({
        max: new FormulaField({deterministic: true}),
        period: new StringField()
      }),
      prompt: new BooleanField({
        initial: true, label: "DND5E.Enchantment.Prompt.Label", hint: "DND5E.Enchantment.Prompt.Hint"
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
   * Enchantments available or applied.
   * @type {ActiveEffect5e[]}
   */
  get enchantments() {
    return this.item.effects.filter(ae => ae.getFlag("dnd5e", "type") === "enchantment");
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

  /**
   * Item to which this enchantment information belongs.
   * @type {Item5e}
   */
  get item() {
    return this.parent.parent;
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

  /* -------------------------------------------- */

  /**
   * Fetch the tracked enchanted items.
   * @returns {Promise<Item5e[]>}
   */
  async getItems() {
    return (await Promise.all(
      Array.from(EnchantmentData.#appliedEnchantments.get(this.item.uuid) ?? [])
        .map(uuid => fromUuid(uuid).then(ae => ae?.parent))
    )).filter(i => i);
  }

  /* -------------------------------------------- */
  /*  Static Registry                             */
  /* -------------------------------------------- */

  /**
   * Registration of enchanted items mapped to a specific enchantment source. The map is keyed by the UUID of
   * enchantment sources while the set contains UUID of items that source has enchanted.
   * @type {Map<string, Set<string>>}
   */
  static #appliedEnchantments = new Map();

  /* -------------------------------------------- */

  /**
   * Add a new enchantment effect to the list of tracked enchantments. Will not track enchanted items in compendiums.
   * @param {string} source     UUID of the active effect origin for the enchantment.
   * @param {string} enchanted  UUID of the enchantment to track.
   */
  static trackEnchantment(source, enchanted) {
    if ( enchanted.startsWith("Compendium.") ) return;
    if ( !EnchantmentData.#appliedEnchantments.has(source) ) {
      EnchantmentData.#appliedEnchantments.set(source, new Set());
    }
    const applied = EnchantmentData.#appliedEnchantments.get(source);
    applied.add(enchanted);
  }

  /* -------------------------------------------- */

  /**
   * Stop tracking an enchantment.
   * @param {string} source     UUID of the active effect origin for the enchantment.
   * @param {string} enchanted  UUID of the enchantment to stop tracking.
   */
  static untrackEnchantment(source, enchanted) {
    if ( !EnchantmentData.#appliedEnchantments.has(source) ) return;
    EnchantmentData.#appliedEnchantments.get(source).delete(enchanted);
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
