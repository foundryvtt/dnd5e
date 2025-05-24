import SystemDataModel from "../abstract/system-data-model.mjs";
import MappingField from "../fields/mapping-field.mjs";

/**
 * A template for currently held currencies.
 *
 * @property {object} currency  Object containing currencies as numbers.
 * @mixin
 */
export default class CurrencyTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      currency: new MappingField(new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0
      }), {initialKeys: CONFIG.DND5E.currencies, initialKeysOnly: true, label: "DND5E.Currency"})
    };
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get the weight of all of the currency. Always returns 0 if currency weight is disabled in settings.
   * @returns {number}
   */
  get currencyWeight() {
    if ( !game.settings.get("dnd5e", "currencyWeight") ) return 0;
    const count = Object.values(this.currency).reduce((count, value) => count + value, 0);
    const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
      ? CONFIG.DND5E.encumbrance.currencyPerWeight.metric
      : CONFIG.DND5E.encumbrance.currencyPerWeight.imperial;
    return count / currencyPerWeight;
  }
}
