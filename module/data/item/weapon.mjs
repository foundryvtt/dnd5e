import { filteredKeys } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import IdentifiableTemplate from "./templates/identifiable.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import MountableTemplate from "./templates/mountable.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

const { NumberField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Weapon items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes IdentifiableTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 * @mixes MountableTemplate
 * @mixes ActivitiesTemplate
 *
 * @property {number} magicalBonus     Magical bonus added to attack & damage rolls.
 * @property {Set<string>} properties  Weapon's properties.
 * @property {number} proficient       Does the weapon's owner have proficiency?
 */
export default class WeaponData extends ItemDataModel.mixin(
  ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate, PhysicalItemTemplate, EquippableItemTemplate,
  ActivatedEffectTemplate, ActionTemplate, MountableTemplate, ActivitiesTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({value: "simpleM", subtype: false}, {label: "DND5E.ItemWeaponType"}),
      magicalBonus: new NumberField({min: 0, integer: true, label: "DND5E.MagicalBonus"}),
      properties: new SetField(new StringField(), {label: "DND5E.ItemWeaponProperties"}),
      proficient: new NumberField({
        required: true, min: 0, max: 1, integer: true, initial: null, label: "DND5E.ProficiencyLevel"
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
    WeaponData.#migratePropertiesData(source);
    WeaponData.#migrateProficient(source);
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
    super.prepareDerivedData();
    this.type.label = CONFIG.DND5E.weaponTypes[this.type.value] ?? game.i18n.localize(CONFIG.Item.typeLabels.weapon);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivatedEffectData();
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
    this.prepareFinalEquippableData();
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
   * Is this item a separate large object like a siege engine or vehicle component that is
   * usually mounted on fixtures rather than equipped, and has its own AC and HP?
   * @type {boolean}
   */
  get isMountable() {
    return this.type.value === "siege";
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
