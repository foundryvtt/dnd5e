import { filteredKeys } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import BaseActivityData from "../activity/base-activity.mjs";
import DamageField from "../shared/damage-field.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import IdentifiableTemplate from "./templates/identifiable.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import MountableTemplate from "./templates/mountable.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Weapon items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes IdentifiableTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes MountableTemplate
 *
 * @property {object} damage
 * @property {DamageData} damage.base       Weapon's base damage.
 * @property {DamageData} damage.versatile  Weapon's versatile damage.
 * @property {number} magicalBonus          Magical bonus added to attack & damage rolls.
 * @property {Set<string>} properties       Weapon's properties.
 * @property {number} proficient            Does the weapon's owner have proficiency?
 * @property {object} range
 * @property {number} range.value           Short range of the weapon.
 * @property {number} range.long            Long range of the weapon.
 * @property {number|null} range.reach      Reach of the weapon.
 * @property {string} range.units           Units used to measure the weapon's range and reach.
 */
export default class WeaponData extends ItemDataModel.mixin(
  ActivitiesTemplate, ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate,
  PhysicalItemTemplate, EquippableItemTemplate, MountableTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.RANGE"];

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({value: "simpleM", subtype: false}, {label: "DND5E.ItemWeaponType"}),
      damage: new SchemaField({
        base: new DamageField(),
        versatile: new DamageField()
      }),
      magicalBonus: new NumberField({min: 0, integer: true, label: "DND5E.MagicalBonus"}),
      properties: new SetField(new StringField(), {label: "DND5E.ItemWeaponProperties"}),
      proficient: new NumberField({
        required: true, min: 0, max: 1, integer: true, initial: null, label: "DND5E.ProficiencyLevel"
      }),
      range: new SchemaField({
        value: new NumberField({ min: 0 }),
        long: new NumberField({ min: 0 }),
        reach: new NumberField({ min: 0 }),
        units: new StringField()
      })
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    enchantable: true,
    inventoryItem: true,
    inventoryOrder: 100
  }, {inplace: false}));

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["type", {
        label: "DND5E.ItemWeaponType",
        type: "set",
        config: {
          choices: CONFIG.DND5E.weaponTypes,
          keyPath: "system.type.value"
        }
      }],
      ["attunement", this.compendiumBrowserAttunementFilter],
      ...this.compendiumBrowserPhysicalItemFilters,
      ["properties", this.compendiumBrowserPropertiesFilter("weapon")]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    WeaponData.#migrateDamage(source);
    WeaponData.#migratePropertiesData(source);
    WeaponData.#migrateProficient(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate weapon damage from old parts.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateDamage(source) {
    const systemData = { system: { scaling: { mode: "none" } } };
    if ( source.damage?.parts?.[0] ) {
      source.damage.base = BaseActivityData.transformDamagePartData(systemData, source.damage.parts?.[0]);
      if ( source.damage.base.bonus === "@mod" ) source.damage.base.bonus = "";
      delete source.damage.parts;
    }
    if ( foundry.utils.getType(source.damage?.versatile) === "string" ) {
      source.damage.versatile = BaseActivityData.transformDamagePartData(systemData, [source.damage?.versatile, ""]);
      if ( source.damage.versatile.bonus === "@mod" ) source.damage.versatile.bonus = "";
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
  prepareDerivedData() {
    ActivitiesTemplate._applyActivityShims.call(this);
    super.prepareDerivedData();
    this.type.label = CONFIG.DND5E.weaponTypes[this.type.value] ?? game.i18n.localize(CONFIG.Item.typeLabels.weapon);
    if ( this.attackType === "ranged" ) this.range.reach = null;
    else if ( this.range.reach === null ) this.range.reach = this.properties.has("rch") ? 10 : 5;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
    this.prepareFinalEquippableData();

    const labels = this.parent.labels ??= {};
    if ( this.hasRange ) {
      const parts = [
        this.range.value,
        this.range.long ? `/ ${this.range.long}` : null,
        game.i18n.localize(`DND5E.Dist${this.range.units.capitalize()}Abbr`)
      ];
      labels.range = parts.filterJoin(" ");
    } else labels.range = game.i18n.localize("DND5E.None");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: CONFIG.DND5E.itemActionTypes[this.actionType],
      modifier: this.parent.labels.modifier,
      range: this.range
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: context.itemType },
      { label: this.type.label },
      ...this.physicalItemSheetFields
    ];
    context.info = [{ label: "DND5E.ToHit", value: dnd5e.utils.formatModifier(parseInt(this.parent.labels.modifier)) }];
    if ( this.parent.labels.derivedDamage?.length ) {
      const config = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
      context.info.push({ value: this.parent.labels.derivedDamage.reduce((str, { formula, damageType }) => {
        const { label, icon } = config[damageType];
        return `${str}
          <span class="formula">${formula}</span>
          <span class="damage-type" data-tooltip="${label}" aria-label="${label}">
            <dnd5e-icon src="${icon}"></dnd5e-icon>
          </span>
        `;
      }, ""), classes: "damage" });
    }
    context.parts = ["dnd5e.details-weapon", "dnd5e.details-damage", "dnd5e.details-uses"];
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Attack type offered by this weapon.
   * @type {"melee"|"ranged"|null}
   */
  get attackType() {
    return CONFIG.DND5E.weaponTypeMap[this.type.value] ?? null;
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [
      this.type.label,
      this.isMountable ? (this.parent.labels?.armor ?? null) : null
    ];
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed on the item card.
   * @type {string[]}
   */
  get cardProperties() {
    return [
      this.isMountable ? (this.parent.labels?.armor ?? null) : null
    ];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeAbilityMod() {
    const { str, dex } = this.parent?.actor?.system.abilities ?? {};
    if ( this.properties.has("fin") && str && dex ) return (dex.mod > str.mod) ? "dex" : "str";
    return { simpleM: "str", martialM: "str", simpleR: "dex", martialR: "dex" }[this.type.value] ?? null;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeCriticalThreshold() {
    return this.parent?.actor?.flags.dnd5e?.weaponCriticalThreshold ?? Infinity;
  }

  /* -------------------------------------------- */

  /**
   * Is the range value relevant to this weapon?
   * @type {boolean}
   */
  get hasRange() {
    return (this.attackType === "ranged") || this.properties.has("thr");
  }

  /* -------------------------------------------- */

  /**
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   */
  get isMountable() {
    return this.type.value === "siege";
  }

  /* -------------------------------------------- */

  /**
   * Does the Weapon implement a versatile damage roll as part of its usage?
   * @type {boolean}
   */
  get isVersatile() {
    return this.properties.has("ver");
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
    if ( actor.type === "npc" ) return 1; // NPCs are always considered proficient with any weapon in their stat block.
    const config = CONFIG.DND5E.weaponProficienciesMap;
    const itemProf = config[this.type.value];
    const actorProfs = actor.system.traits?.weaponProf?.value ?? new Set();
    const natural = this.type.value === "natural";
    const improvised = (this.type.value === "improv") && !!actor.getFlag("dnd5e", "tavernBrawlerFeat");
    const isProficient = natural || improvised || actorProfs.has(itemProf) || actorProfs.has(this.type.baseItem);
    return Number(isProficient);
  }
}
