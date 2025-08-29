import { filteredKeys } from "../../utils.mjs";
import ItemDataModel from "../abstract/item-data-model.mjs";
import BaseActivityData from "../activity/base-activity.mjs";
import DamageField from "../shared/damage-field.mjs";
import UsesField from "../shared/uses-field.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import IdentifiableTemplate from "./templates/identifiable.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 */

/**
 * Data definition for Consumable items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes IdentifiableTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 *
 * @property {object} damage
 * @property {DamageData} damage.base               Damage caused by this ammunition.
 * @property {string} damage.replace                Should ammunition damage replace the base weapon's damage?
 * @property {number} magicalBonus                  Magical bonus added to attack & damage rolls by ammunition.
 * @property {Set<string>} properties               Ammunition properties.
 * @property {Omit<ItemTypeData, "baseItem">} type  Ammunition type and subtype.
 * @property {object} uses
 * @property {boolean} uses.autoDestroy  Should this item be destroyed when it runs out of uses.
 */
export default class ConsumableData extends ItemDataModel.mixin(
  ActivitiesTemplate, ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate,
  PhysicalItemTemplate, EquippableItemTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.CONSUMABLE", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      damage: new SchemaField({
        base: new DamageField(),
        replace: new BooleanField()
      }),
      magicalBonus: new NumberField({ min: 0, integer: true }),
      properties: new SetField(new StringField()),
      type: new ItemTypeField({ baseItem: false }, { label: "DND5E.ItemConsumableType" }),
      uses: new UsesField({
        autoDestroy: new BooleanField({ required: true })
      })
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
        label: "DND5E.ItemConsumableType",
        type: "set",
        config: {
          choices: CONFIG.DND5E.consumableTypes,
          keyPath: "system.type.value"
        }
      }],
      ["attunement", this.compendiumBrowserAttunementFilter],
      ...this.compendiumBrowserPhysicalItemFilters,
      ["properties", this.compendiumBrowserPropertiesFilter("consumable")]
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Default configuration for this item type's inventory section.
   * @returns {InventorySectionDescriptor}
   */
  static get inventorySection() {
    return {
      id: "consumables",
      order: 300,
      label: "TYPES.Item.consumablePl",
      groups: { type: "consumable" },
      columns: ["price", "weight", "quantity", "charges", "controls"]
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    ConsumableData.#migrateDamage(source);
    ConsumableData.#migratePropertiesData(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate weapon damage from old parts.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateDamage(source) {
    if ( "base" in (source.damage ?? {}) ) return;
    const systemData = { system: { scaling: { mode: "none" } } };
    if ( source.damage?.parts?.[0] ) {
      source.damage.base = BaseActivityData.transformDamagePartData(systemData, source.damage.parts.shift());
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate the properties object into a set.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migratePropertiesData(source) {
    if ( foundry.utils.getType(source.properties) !== "Object" ) return;
    source.properties = filteredKeys(source.properties);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
    this.prepareIdentifiable();
    this.preparePhysicalData();
    if ( !this.type.value ) return;
    const config = CONFIG.DND5E.consumableTypes[this.type.value];
    if ( config ) {
      this.type.label = config.subtypes?.[this.type.subtype] ?? config.label;
    } else {
      this.type.label = game.i18n.localize(CONFIG.Item.typeLabels.consumable);
    }
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
      uses: this.hasLimitedUses ? this.getUsesData() : null,
      quantity: this.quantity
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: this.type.label },
      ...this.physicalItemSheetFields
    ];

    context.parts = ["dnd5e.details-consumable", "dnd5e.field-uses"];
    context.damageTypes = Object.entries(CONFIG.DND5E.damageTypes).map(([value, { label }]) => {
      return {
        value, label,
        selected: context.source.damage.base.types.includes?.(value) ?? context.source.damage.base.types.has(value)
      };
    });
    context.denominationOptions = [
      { value: "", label: "" },
      { rule: true },
      ...CONFIG.DND5E.dieSteps.map(value => ({ value, label: `d${value}` }))
    ];
    const itemTypes = CONFIG.DND5E.consumableTypes[this._source.type.value];
    if ( itemTypes ) {
      context.itemType = itemTypes.label;
      context.itemSubtypes = itemTypes.subtypes;
    }
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [
      this.type.label,
      this.hasLimitedUses ? `${this.uses.value}/${this.uses.max} ${game.i18n.localize("DND5E.Charges")}` : null,
      this.priceLabel
    ];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get _typeAbilityMod() {
    if ( this.type.value !== "scroll" ) return null;
    return this.parent?.actor?.system.attributes.spellcasting || "int";
  }

  /* -------------------------------------------- */

  /** @override */
  static get itemCategories() {
    return CONFIG.DND5E.consumableTypes;
  }

  /* -------------------------------------------- */

  /**
   * Does this item have base damage defined in `damage.base` to offer to an activity?
   * @type {boolean}
   */
  get offersBaseDamage() {
    return this.type.value === "ammo";
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    const isProficient = this.parent?.actor?.getFlag("dnd5e", "tavernBrawlerFeat");
    return isProficient ? 1 : 0;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  get validProperties() {
    const valid = super.validProperties;
    if ( this.type.value === "ammo" ) Object.entries(CONFIG.DND5E.itemProperties).forEach(([k, v]) => {
      if ( v.isPhysical ) valid.add(k);
      valid.add("ret");
    });
    else if ( this.type.value === "scroll" ) CONFIG.DND5E.validProperties.spell
      .filter(p => p !== "material").forEach(p => valid.add(p));
    return valid;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;
    await this.preUpdateIdentifiable(changed, options, user);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async getCraftCost(options={}) {
    const { days, gold } = await super.getCraftCost(options);
    const { consumable, magic } = CONFIG.DND5E.crafting;
    const { rarity } = this;
    if ( !this.properties.has("mgc") || !(rarity in magic) ) return { days, gold };
    const costs = magic[rarity];
    return {
      days: Math.floor(costs.days * consumable.days),
      gold: Math.floor(costs.gold * consumable.gold)
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  getRollData(...options) {
    const data = super.getRollData(...options);
    const spellLevel = this.parent.getFlag("dnd5e", "spellLevel");
    if ( spellLevel ) data.item.level = spellLevel.value ?? spellLevel.base;
    return data;
  }
}
