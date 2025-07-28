import SystemDataModel from "../../abstract/system-data-model.mjs";

const { BooleanField, StringField } = foundry.data.fields;

/**
 * Data model template with information on items that can be attuned and equipped.
 *
 * @property {string} attunement  Attunement information as defined in `DND5E.attunementTypes`.
 * @property {boolean} attuned    Is this item attuned on its owning actor?
 * @property {boolean} equipped   Is this item equipped on its owning actor?
 * @mixin
 */
export default class EquippableItemTemplate extends SystemDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      attunement: new StringField({required: true, label: "DND5E.Attunement"}),
      attuned: new BooleanField({label: "DND5E.Attuned"}),
      equipped: new BooleanField({required: true, label: "DND5E.Equipped"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Create attunement filter configuration.
   * @returns {CompendiumBrowserFilterDefinitionEntry}
   */
  static get compendiumBrowserAttunementFilter() {
    return {
      label: "DND5E.Attunement",
      type: "boolean",
      createFilter: (filters, value, def) => {
        if ( value === 0 ) return;
        const filter = { k: "system.attunement", o: "in", v: ["required", 1] };
        if ( value === 1 ) filters.push(filter);
        else filters.push({ o: "NOT", v: filter });
      }
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
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
    switch ( source.attunement ) {
      case 2: source.attuned = true;
      case 1: source.attunement = "required"; break;
      case 0: source.attunement = ""; break;
    }
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
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Ensure items that cannot be attuned are not marked as attuned. If attuned and on an actor type that
   * tracks attunement, increase that actor's attunement count.
   */
  prepareFinalEquippableData() {
    if ( this.validProperties.has("mgc") && !this.properties.has("mgc") ) this.attunement = "";
    if ( !this.attunement ) this.attuned = false;
    if ( this.attuned && this.parent.actor?.system.attributes?.attunement ) {
      this.parent.actor.system.attributes.attunement.value += 1;
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Chat properties for equippable items.
   * @type {string[]}
   */
  get equippableItemCardProperties() {
    return [
      this.attunement === "required" ? CONFIG.DND5E.attunementTypes.required : null,
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
    const attunement = this.attuned || (this.attunement !== "required");
    return attunement && this.properties.has("mgc") && this.validProperties.has("mgc");
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Set as equipped for NPCs, and unequipped for PCs.
   * @param {object} data     The initial data object provided to the document creation request.
   * @param {object} options  Additional options which modify the creation request.
   * @param {User} user       The User requesting the document creation.
   */
  preCreateEquipped(data, options, user) {
    if ( ["character", "npc"].includes(this.parent.actor?.type)
      && !foundry.utils.hasProperty(data, "system.equipped") ) {
      this.updateSource({ equipped: this.parent.actor.type === "npc" });
    }
  }
}
