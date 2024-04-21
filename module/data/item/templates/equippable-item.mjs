import SystemDataModel from "../../abstract.mjs";

/**
 * Data model template with information on items that can be attuned and equipped.
 *
 * @property {number} attunement  Attunement information as defined in `DND5E.attunementTypes`.
 * @property {boolean} equipped   Is this item equipped on its owning actor.
 * @mixin
 */
export default class EquippableItemTemplate extends SystemDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      attunement: new foundry.data.fields.NumberField({
        required: true, integer: true, initial: CONFIG.DND5E.attunementTypes.NONE, label: "DND5E.Attunement"
      }),
      equipped: new foundry.data.fields.BooleanField({required: true, label: "DND5E.Equipped"})
    };
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    EquippableItemTemplate.#migrateAttunement(source);
    EquippableItemTemplate.#migrateEquipped(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the item's attuned boolean to attunement string.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateAttunement(source) {
    if ( (source.attuned === undefined) || (source.attunement !== undefined) ) return;
    source.attunement = source.attuned ? CONFIG.DND5E.attunementTypes.ATTUNED : CONFIG.DND5E.attunementTypes.NONE;
  }

  /* -------------------------------------------- */

  /**
   * Migrate the equipped field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateEquipped(source) {
    if ( !("equipped" in source) ) return;
    if ( (source.equipped === null) || (source.equipped === undefined) ) source.equipped = false;
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Chat properties for equippable items.
   * @type {string[]}
   */
  get equippableItemCardProperties() {
    const req = CONFIG.DND5E.attunementTypes.REQUIRED;
    return [
      this.attunement === req ? CONFIG.DND5E.attunements[req] : null,
      game.i18n.localize(this.equipped ? "DND5E.Equipped" : "DND5E.Unequipped"),
      ("proficient" in this) ? CONFIG.DND5E.proficiencyLevels[this.prof?.multiplier || 0] : null
    ];
  }

  /* -------------------------------------------- */

  /**
   * Are the magical properties of this item, such as magical bonuses to armor & damage, available?
   * @type {boolean}
   */
  get magicAvailable() {
    const attunement = this.attunement !== CONFIG.DND5E.attunementTypes.REQUIRED;
    return attunement && this.properties.has("mgc") && this.validProperties.has("mgc");
  }
}
