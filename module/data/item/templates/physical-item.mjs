/**
 * Data model template with information on physical items.
 *
 * @property {number} quantity     Number of items in a stack.
 * @property {number} weight       Item's weight in pounds or kilograms (depending on system setting).
 * @property {number} price        Item's cost in GP.
 * @property {number} attunement   Attunement information as defined in `DND5E.attunementTypes`.
 * @property {boolean} equipped    Is this item equipped on its owning actor.
 * @property {string} rarity       Item rarity as defined in `DND5E.itemRarity`.
 * @property {boolean} identified  Has this item been identified?
 * @mixin
 */
export default class PhysicalItemTemplate extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      quantity: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, positive: true, initial: 1, label: "DND5E.Quantity"
      }),
      weight: new foundry.data.fields.NumberField({
        required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Weight"
      }),
      price: new foundry.data.fields.NumberField({
        required: true, nullable: false, initial: 0, min: 0, label: "DND5E.Price"
      }),
      attunement: new foundry.data.fields.NumberField({
        required: true, integer: true, initial: CONFIG.DND5E.attunementTypes.NONE, label: "DND5E.Attunement"
      }),
      equipped: new foundry.data.fields.BooleanField({required: true, label: "DND5E.Equipped"}),
      rarity: new foundry.data.fields.StringField({required: true, blank: true, label: "DND5E.Rarity"}),
      identified: new foundry.data.fields.BooleanField({required: true, initial: true, label: "DND5E.Identified"})
    };
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static migrateData(source) {
    this.migrateAttunement(source);
    this.migrateRarity(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the item's attuned boolean to attunement string.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateAttunement(source) {
    if ( (source.attuned === undefined) || (source.attunement !== undefined) ) return;
    source.attunement = source.attuned ? CONFIG.DND5E.attunementTypes.ATTUNED : CONFIG.DND5E.attunementTypes.NONE;
  }

  /* -------------------------------------------- */

  /**
   * Migrate the item's rarity from freeform string to enum value.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static migrateRarity(source) {
    if ( !source.rarity ) return;
    const rarity = Object.keys(CONFIG.DND5E.itemRarity).find(key =>
      (CONFIG.DND5E.itemRarity[key].toLowerCase() === source.rarity.toLowerCase()) || (key === source.rarity)
    );
    if ( rarity ) source.rarity = rarity;
  }
}
