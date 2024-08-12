import FormulaField from "../../fields/formula-field.mjs";
import IdentifierField from "../../fields/identifier-field.mjs";

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
 * Data stored in "enchantment" flag on enchantment active effects.
 *
 * @typedef {object} EnchantmentProfile
 * @property {object} level
 * @property {number} level.min        Minimum level at which this profile can be used.
 * @property {number} level.max        Maximum level at which this profile can be used.
 * @property {object} riders
 * @property {string[]} riders.effect  IDs of other effects on this item that will be added with this enchantment.
 * @property {string[]} riders.item    UUIDs of items that will be added with this enchantment.
 */

/**
 * Data model for enchantment configuration.
 *
 * @property {string} classIdentifier             Class identifier that will be used to determine applicable level.
 * @property {object} items
 * @property {string} items.max                   Maximum number of items that can have this enchantment.
 * @property {string} items.period                Frequency at which the enchantment be swapped.
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical  Allow enchantments to be applied to items that are already magical.
 * @property {string} restrictions.type           Item type to which this enchantment can be applied.
 */
export class EnchantmentData extends foundry.abstract.DataModel {

  /** @inheritDoc */
  static defineSchema() {
    return {
      classIdentifier: new IdentifierField(),
      items: new SchemaField({
        max: new FormulaField({deterministic: true}),
        period: new StringField()
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
   * Enchantments that have been applied by this item.
   * @type {ActiveEffect5e[]}
   */
  get appliedEnchantments() {
    return EnchantmentData.appliedEnchantments(this.item.uuid);
  }

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
    return this.item.effects.filter(ae => ae.type === "enchantment");
  }

  /* -------------------------------------------- */

  /**
   * Is this feature an enchantment?
   * @param {FeatData} data  Data for the feature.
   * @returns {boolean}
   */
  static isEnchantment(data) {
    return data.actionType === "ench";
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
   * Return only the allowed enchantments based on spell/character/class level.
   * @param {Item5e} item   Item from which to fetch the enchantments.
   * @returns {ActiveEffect5e[]}
   */
  static availableEnchantments(item) {
    const keyPath = item.type === "spell"
      ? "item.level"
      : item.system.enchantment?.classIdentifier
        ? `classes.${item.system.enchantment?.classIdentifier}.levels`
        : "details.level";
    const level = foundry.utils.getProperty(item.getRollData(), keyPath) ?? 0;
    return item.effects.filter(e => {
      if ( (e.type !== "enchantment") || e.isAppliedEnchantment ) return false;
      const { min, max } = e.getFlag("dnd5e", "enchantment.level") ?? {};
      return ((min ?? -Infinity) <= level) && (level <= (max ?? Infinity));
    });
  }

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
  /*  Static Registry                             */
  /* -------------------------------------------- */

  /**
   * Registration of enchanted items mapped to a specific enchantment source. The map is keyed by the UUID of
   * enchantment sources while the set contains UUID of applied enchantment active effects.
   * @type {Map<string, Set<string>>}
   */
  static #appliedEnchantments = new Map();

  /* -------------------------------------------- */

  /**
   * Fetch the tracked enchanted items.
   * @param {string} itemUuid  UUID of the item supplying the enchantments.
   * @returns {ActiveEffect5e[]}
   */
  static appliedEnchantments(itemUuid) {
    return Array.from(EnchantmentData.#appliedEnchantments.get(itemUuid) ?? [])
      .map(uuid => fromUuidSync(uuid))
      .filter(i => i);
  }

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
    EnchantmentData.#appliedEnchantments.get(source).add(enchanted);
  }

  /* -------------------------------------------- */

  /**
   * Stop tracking an enchantment.
   * @param {string} source     UUID of the active effect origin for the enchantment.
   * @param {string} enchanted  UUID of the enchantment to stop tracking.
   */
  static untrackEnchantment(source, enchanted) {
    EnchantmentData.#appliedEnchantments.get(source)?.delete(enchanted);
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
