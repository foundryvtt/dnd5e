import ItemDataModel from "../abstract/item-data-model.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import IdentifiableTemplate from "./templates/identifiable.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import MountableTemplate from "./templates/mountable.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 */

/**
 * Data definition for Equipment items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes IdentifiableTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes MountableTemplate
 *
 * @property {object} armor                        Armor details and equipment type information.
 * @property {number} armor.value                  Base armor class or shield bonus.
 * @property {number} armor.dex                    Maximum dex bonus added to armor class.
 * @property {number} armor.magicalBonus           Bonus added to AC from the armor's magical nature.
 * @property {number} proficient                   Does the owner have proficiency in this piece of equipment?
 * @property {Set<string>} properties              Equipment properties.
 * @property {number} strength                     Minimum strength required to use a piece of armor.
 * @property {Omit<ItemTypeData, "subtype">} type  Equipment type & base item.
 */
export default class EquipmentData extends ItemDataModel.mixin(
  ActivitiesTemplate, ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate,
  PhysicalItemTemplate, EquippableItemTemplate, MountableTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.VEHICLE.MOUNTABLE", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      armor: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.ArmorClass" }),
        magicalBonus: new NumberField({ min: 0, integer: true, label: "DND5E.MagicalBonus" }),
        dex: new NumberField({ required: true, integer: true, label: "DND5E.ItemEquipmentDexMod" })
      }),
      proficient: new NumberField({
        required: true, min: 0, max: 1, integer: true, initial: null, label: "DND5E.ProficiencyLevel"
      }),
      properties: new SetField(new StringField(), { label: "DND5E.ItemEquipmentProperties" }),
      strength: new NumberField({ required: true, integer: true, min: 0, label: "DND5E.ItemRequiredStr" }),
      type: new ItemTypeField({ subtype: false }, { label: "DND5E.ItemEquipmentType" })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    hasEffects: true,
    enchantable: true
  }, {inplace: false}));

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["type", {
        label: "DND5E.ItemEquipmentType",
        type: "set",
        config: {
          choices: CONFIG.DND5E.equipmentTypes,
          keyPath: "system.type.value"
        }
      }],
      ["attunement", this.compendiumBrowserAttunementFilter],
      ...this.compendiumBrowserPhysicalItemFilters,
      ["properties", this.compendiumBrowserPropertiesFilter("equipment")]
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Default configuration for this item type's inventory section.
   * @returns {InventorySectionDescriptor}
   */
  static get inventorySection() {
    return {
      id: "equipment",
      order: 200,
      label: "TYPES.Item.equipmentPl",
      groups: { type: "equipment" },
      columns: ["price", "weight", "quantity", "charges", "controls"]
    };
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    EquipmentData.#migrateArmor(source);
    EquipmentData.#migrateType(source);
    EquipmentData.#migrateStrength(source);
    EquipmentData.#migrateProficient(source);
  }

  /* -------------------------------------------- */

  /**
   * Apply migrations to the armor field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateArmor(source) {
    if ( !("armor" in source) ) return;
    source.armor ??= {};
    if ( (typeof source.armor.dex === "string") ) {
      const dex = source.armor.dex;
      if ( dex === "" ) source.armor.dex = null;
      else if ( Number.isNumeric(dex) ) source.armor.dex = Number(dex);
    }
  }

  /* -------------------------------------------- */

  /**
   * Apply migrations to the type field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateType(source) {
    if ( !("type" in source) ) return;
    if ( source.type.value === "bonus" ) source.type.value = "trinket";
  }

  /* -------------------------------------------- */

  /**
   * Ensure blank strength values are migrated to null, and string values are converted to numbers.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateStrength(source) {
    if ( typeof source.strength !== "string" ) return;
    if ( source.strength === "" ) source.strength = null;
    if ( Number.isNumeric(source.strength) ) source.strength = Number(source.strength);
  }

  /* -------------------------------------------- */

  /**
   * Migrates stealth disadvantage boolean to properties.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static _migrateStealth(source) {
    if ( foundry.utils.getProperty(source, "system.stealth") === true ) {
      foundry.utils.setProperty(source, "flags.dnd5e.migratedProperties", ["stealthDisadvantage"]);
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the proficient field to convert boolean values.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateProficient(source) {
    if ( typeof source.proficient === "boolean" ) source.proficient = Number(source.proficient);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.armor.base = this.armor.value = (this._source.armor.value ?? 0);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
    this.prepareIdentifiable();
    this.preparePhysicalData();
    if ( this.magicAvailable && this.armor.magicalBonus ) this.armor.value += this.armor.magicalBonus;
    this.type.label = CONFIG.DND5E.equipmentTypes[this.type.value]
      ?? game.i18n.localize(CONFIG.Item.typeLabels.equipment);
    this.type.identifier = this.type.value === "shield"
      ? CONFIG.DND5E.shieldIds[this.type.baseItem]
      : CONFIG.DND5E.armorIds[this.type.baseItem];

    const labels = this.parent.labels ??= {};
    labels.armor = this.armor.value ? `${this.armor.value} ${game.i18n.localize("DND5E.AC")}` : "";
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
    this.prepareFinalEquippableData();
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: [this.type.label, this.parent.labels.activation],
      uses: this.hasLimitedUses ? this.getUsesData() : null
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: this.type.label },
      ...this.physicalItemSheetFields
    ];

    context.parts = ["dnd5e.details-equipment", "dnd5e.field-uses"];
    context.equipmentTypeOptions = [
      ...Object.entries(CONFIG.DND5E.miscEquipmentTypes).map(([value, label]) => ({ value, label })),
      ...Object.entries(CONFIG.DND5E.armorTypes).map(([value, label]) => ({ value, label, group: "DND5E.Armor" }))
    ];
    context.hasDexModifier = this.isArmor && (this.type.value !== "shield");
    if ( this.armor.value && (this.isArmor || (this.type.value === "shield")) ) {
      context.properties.active.shift();
      context.info = [{
        label: "DND5E.ArmorClass",
        classes: "info-lg",
        value: this.type.value === "shield" ? dnd5e.utils.formatModifier(this.armor.value) : this.armor.value
      }];
    }
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [
      this.type.label,
      (this.isArmor || this.isMountable) ? (this.parent.labels?.armor ?? null) : null,
      this.properties.has("stealthDisadvantage") ? game.i18n.localize("DND5E.ITEM.Property.StealthDisadvantage") : null
    ];
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed on the item card.
   * @type {string[]}
   */
  get cardProperties() {
    return [
      (this.isArmor || this.isMountable) ? (this.parent.labels?.armor ?? null) : null,
      this.properties.has("stealthDisadvantage") ? game.i18n.localize("DND5E.ITEM.Property.StealthDisadvantage") : null
    ];
  }

  /* -------------------------------------------- */

  /**
   * Is this Item any of the armor subtypes?
   * @type {boolean}
   */
  get isArmor() {
    return this.type.value in CONFIG.DND5E.armorTypes;
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   */
  get isMountable() {
    return this.type.value === "vehicle";
  }

  /* -------------------------------------------- */

  /** @override */
  static get itemCategories() {
    return CONFIG.DND5E.equipmentTypes;
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    if ( Number.isFinite(this.proficient) ) return this.proficient;
    const actor = this.parent.actor;
    if ( !actor ) return 0;
    if ( actor.type === "npc" ) return 1; // NPCs are always considered proficient with any armor in their stat block.
    const config = CONFIG.DND5E.armorProficienciesMap;
    const itemProf = config[this.type.value];
    const actorProfs = actor.system.traits?.armorProf?.value ?? new Set();
    const isProficient = (itemProf === true) || actorProfs.has(itemProf) || actorProfs.has(this.type.baseItem);
    return Number(isProficient);
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    await this.preCreateEquipped(data, options, user);

    // Set type as "Vehicle Equipment" if created directly on a vehicle
    if ( (this.parent.actor?.type === "vehicle") && !foundry.utils.hasProperty(data, "system.type.value") ) {
      this.updateSource({ "type.value": "vehicle" });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;
    await this.preUpdateIdentifiable(changed, options, user);
  }
}
