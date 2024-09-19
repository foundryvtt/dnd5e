import FormulaField from "../../fields/formula-field.mjs";
import IdentifierField from "../../fields/identifier-field.mjs";

const { BooleanField, EmbeddedDataField, SchemaField, StringField } = foundry.data.fields;

/**
 * A field for storing enchantment data.
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
