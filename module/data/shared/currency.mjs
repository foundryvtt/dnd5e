/**
 * An embedded data structure for currently held currencies.
 *
 * @property {number} pp  Platinum pieces.
 * @property {number} gp  Gold pieces.
 * @property {number} ep  Electrum pieces.
 * @property {number} sp  Silver pieces.
 * @property {number} cp  Copper pieces.
 */
export default class CurrencyData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      pp: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.CurrencyPP"
      }),
      gp: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.CurrencyGP"
      }),
      ep: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.CurrencyEP"
      }),
      sp: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.CurrencySP"
      }),
      cp: new foundry.data.fields.NumberField({
        required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.CurrencyCP"
      })
    };
  }
}
