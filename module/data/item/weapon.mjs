import { convertLength, defaultUnits, filteredKeys, formatLength } from "../../utils.mjs";
import ItemDataModel from "../abstract/item-data-model.mjs";
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
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 */

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
 * @property {object} ammunition
 * @property {string} ammunition.type              Type of ammunition fired by this weapon.
 * @property {object} armor
 * @property {number} armor.value                  Siege or vehicle weapon's armor class.
 * @property {object} damage
 * @property {DamageData} damage.base              Weapon's base damage.
 * @property {DamageData} damage.versatile         Weapon's versatile damage.
 * @property {number} magicalBonus                 Magical bonus added to attack & damage rolls.
 * @property {string} mastery                      Mastery Property usable with this weapon.
 * @property {Set<string>} properties              Weapon's properties.
 * @property {number} proficient                   Does the weapon's owner have proficiency?
 * @property {object} range
 * @property {number} range.value                  Short range of the weapon.
 * @property {number} range.long                   Long range of the weapon.
 * @property {number|null} range.reach             Reach of the weapon.
 * @property {string} range.units                  Units used to measure the weapon's range and reach.
 * @property {Omit<ItemTypeData, "subtype">} type  Weapon type and base item.
 */
export default class WeaponData extends ItemDataModel.mixin(
  ActivitiesTemplate, ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate,
  PhysicalItemTemplate, EquippableItemTemplate, MountableTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.WEAPON", "DND5E.VEHICLE.MOUNTABLE", "DND5E.RANGE", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      ammunition: new SchemaField({
        type: new StringField()
      }),
      armor: new SchemaField({
        value: new NumberField({ integer: true, min: 0 })
      }),
      damage: new SchemaField({
        base: new DamageField(),
        versatile: new DamageField()
      }),
      magicalBonus: new NumberField({min: 0, integer: true, label: "DND5E.MagicalBonus"}),
      mastery: new StringField(),
      properties: new SetField(new StringField(), {label: "DND5E.ItemWeaponProperties"}),
      proficient: new NumberField({
        required: true, min: 0, max: 1, integer: true, initial: null, label: "DND5E.ProficiencyLevel"
      }),
      range: new SchemaField({
        value: new NumberField({ min: 0 }),
        long: new NumberField({ min: 0 }),
        reach: new NumberField({ min: 0 }),
        units: new StringField()
      }),
      type: new ItemTypeField({value: "simpleM", subtype: false}, {label: "DND5E.ItemWeaponType"})
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
        label: "DND5E.ItemWeaponType",
        type: "set",
        config: {
          choices: CONFIG.DND5E.weaponTypes,
          keyPath: "system.type.value"
        }
      }],
      ["mastery", {
        label: "DND5E.WEAPON.Mastery.Label",
        type: "set",
        config: {
          choices: CONFIG.DND5E.weaponMasteries,
          keyPath: "system.mastery"
        }
      }],
      ["attunement", this.compendiumBrowserAttunementFilter],
      ...this.compendiumBrowserPhysicalItemFilters,
      ["properties", this.compendiumBrowserPropertiesFilter("weapon")]
    ]);
  }

  /* -------------------------------------------- */

  /**
   * Default configuration for this item type's inventory section.
   * @returns {InventorySectionDescriptor}
   */
  static get inventorySection() {
    return {
      id: "weapons",
      order: 100,
      label: "TYPES.Item.weaponPl",
      groups: { type: "weapon" },
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
    WeaponData.#migrateDamage(source);
    WeaponData.#migratePropertiesData(source);
    WeaponData.#migrateProficient(source);
    WeaponData.#migrateReach(source);
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
      if ( source.damage.base.bonus === "@mod" ) source.damage.base.bonus = "";
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

  /**
   * Migrate the range value to the reach field for melee weapons without the thrown property.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateReach(source) {
    if ( !source.properties || !source.range?.value || !source.type?.value
      || (source.range?.reach !== undefined) ) return;
    if ( (CONFIG.DND5E.weaponTypeMap[source.type.value] !== "melee") || source.properties.includes("thr") ) return;
    // Range of `0` or greater than `10` is always included, and so is range longer than `5` without reach property
    if ( (source.range.value === 0) || (source.range.value > 10)
      || (!source.properties.includes("rch") && (source.range.value > 5)) ) {
      source.range.reach = source.range.value;
    }
    source.range.value = null;
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
    this.type.label = CONFIG.DND5E.weaponTypes[this.type.value] ?? game.i18n.localize(CONFIG.Item.typeLabels.weapon);
    this.type.identifier = CONFIG.DND5E.weaponIds[this.type.baseItem];

    const labels = this.parent.labels ??= {};
    labels.armor = this.armor.value ? `${this.armor.value} ${game.i18n.localize("DND5E.AC")}` : "";
    labels.damage = this.damage.base.formula;
    labels.damageTypes = game.i18n.getListFormatter({ style: "narrow" }).format(
      Array.from(this.damage.base.types).map(t => CONFIG.DND5E.damageTypes[t]?.label).filter(t => t)
    );

    if ( this.attackType === "ranged" ) this.range.reach = null;
    else if ( this.range.reach === null ) {
      this.range.reach = convertLength(this.properties.has("rch") ? 10 : 5, "ft", this.range.units, { strict: false });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
    this.prepareFinalEquippableData();

    const labels = this.parent.labels ??= {};
    const units = this.range.units ?? defaultUnits("length");
    if ( this.hasRange ) {
      const parts = [this.range.value, this.range.long !== this.range.value ? this.range.long : null].filter(_ => _);
      parts.push(formatLength(parts.pop(), units));
      labels.range = parts.filterJoin("/");
    }
    if ( this.range.reach ) {
      labels.reach = game.i18n.format("DND5E.RANGE.Formatted.Reach", { reach: formatLength(this.range.reach, units) });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: CONFIG.DND5E.itemActionTypes[this.activities.contents[0]?.actionType],
      modifier: this.parent.labels.modifier,
      range: this.range
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: game.i18n.localize(CONFIG.Item.typeLabels.weapon) },
      { label: this.type.label },
      ...this.physicalItemSheetFields
    ];

    context.info = [{
      label: "DND5E.ToHit",
      classes: "info-lg",
      value: dnd5e.utils.formatModifier(parseInt(this.parent.labels.modifier))
    }];
    if ( this.parent.labels.damages?.length ) {
      const config = { ...CONFIG.DND5E.damageTypes, ...CONFIG.DND5E.healingTypes };
      context.info.push({ value: this.parent.labels.damages.reduce((str, { formula, damageType }) => {
        const type = config[damageType];
        return `${str}
          <span class="formula">${formula}</span>
          ${type ? `<span class="damage-type" data-tooltip aria-label="${type.label}">
            <dnd5e-icon src="${type.icon}"></dnd5e-icon>
          </span>` : ""}
        `;
      }, ""), classes: "info-grid damage" });
    }

    context.parts = ["dnd5e.details-weapon", "dnd5e.field-uses"];
    context.damageTypes = Object.entries(CONFIG.DND5E.damageTypes).map(([value, { label }]) => {
      return {
        value, label,
        selected: context.source.damage.base.types.includes?.(value) ?? context.source.damage.base.types.has(value)
      };
    });
    const makeDenominationOptions = placeholder => [
      { value: "", label: placeholder ? `d${placeholder}` : "" },
      { rule: true },
      ...CONFIG.DND5E.dieSteps.map(value => ({ value, label: `d${value}` }))
    ];
    context.denominationOptions = {
      base: makeDenominationOptions(),
      versatile: makeDenominationOptions(this.damage.base.denomination ? this.damage.base.steppedDenomination() : "")
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Ammunition that can be used with this weapon.
   * @type {FormSelectOption[]}
   */
  get ammunitionOptions() {
    if ( !this.parent.actor || !this.properties.has("amm") ) return [];
    return this.parent.actor.itemTypes.consumable
      .filter(i => (i.system.type.value === "ammo")
        && (!this.ammunition?.type || (i.system.type.subtype === this.ammunition.type)))
      .map(item => ({
        item,
        value: item.id,
        label: `${item.name} (${item.system.quantity})`,
        disabled: !item.system.quantity
      }))
      .sort((lhs, rhs) => lhs.label.localeCompare(rhs.label, game.i18n.lang));
  }

  /* -------------------------------------------- */

  /**
   * Attack classification of this weapon.
   * @type {"weapon"|"unarmed"}
   */
  get attackClassification() {
    return CONFIG.DND5E.weaponClassificationMap[this.type.value] ?? "weapon";
  }

  /* -------------------------------------------- */

  /** @override */
  get attackModes() {
    const modes = [];

    // Thrown ranged weapons will just display the "Thrown" mode
    if ( !(this.properties.has("thr") && (this.attackType === "ranged")) ) {
      // Weapons without the "Two-Handed" property or with the "Versatile" property will have One-Handed attack
      if ( this.isVersatile || !this.properties.has("two") ) modes.push({
        value: "oneHanded", label: CONFIG.DND5E.attackModes.oneHanded.label
      });

      // Weapons with the "Two-Handed" property or with the "Versatile" property will have Two-Handed attack
      if ( this.isVersatile || this.properties.has("two") ) modes.push({
        value: "twoHanded", label: CONFIG.DND5E.attackModes.twoHanded.label
      });
    }

    const isLight = this.properties.has("lgt") || (this.parent.actor?.getFlag("dnd5e", "enhancedDualWielding")
      && ((this.attackType === "melee") && !this.properties.has("two")));

    // Weapons with the "Light" property will have Offhand attack
    // If player has the "Enhanced Dual Wielding" flag, then allow any melee weapon without the "Two-Handed" property
    if ( isLight ) modes.push({
      value: "offhand", label: CONFIG.DND5E.attackModes.offhand.label
    });

    // Weapons with the "Thrown" property will have Thrown attack
    if ( this.properties.has("thr") ) {
      if ( modes.length ) modes.push({ rule: true });
      modes.push({ value: "thrown", label: CONFIG.DND5E.attackModes.thrown.label });

      // Weapons with the "Thrown" & "Light" properties will have an Offhand Throw attack
      if ( isLight ) modes.push({
        value: "thrown-offhand", label: CONFIG.DND5E.attackModes["thrown-offhand"].label
      });
    }

    else if ( !this.attackType && ((this.range.value ?? 0) > (this.range.reach ?? 0)) ) {
      if ( modes.length ) modes.push({ rule: true });
      modes.push({ value: "ranged", label: CONFIG.DND5E.attackModes.ranged.label });
    }

    return modes;
  }

  /* -------------------------------------------- */

  /**
   * Attack type offered by this weapon.
   * @type {"melee"|"ranged"|null}
   */
  get attackType() {
    return CONFIG.DND5E.weaponTypeMap[this.type.value] ?? null;
  }

  /* -------------------------------------------- */

  /** @override */
  get availableAbilities() {
    const melee = CONFIG.DND5E.defaultAbilities.meleeAttack;
    const ranged = CONFIG.DND5E.defaultAbilities.rangedAttack;
    if ( this.properties.has("fin") || (this.type.value === "natural") ) return new Set([melee, ranged]);
    if ( !this.attackType ) return null;
    return new Set([this.attackType === "melee" ? melee : ranged]);
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

  /** @inheritDoc */
  get _typeAbilityMod() {
    const availableAbilities = this.availableAbilities;
    if ( !availableAbilities ) return null;
    if ( availableAbilities.size === 1 ) return availableAbilities.first();
    const abilities = this.parent?.actor?.system.abilities ?? {};
    return availableAbilities.reduce((largest, ability) =>
      (abilities[ability]?.mod ?? -Infinity) > (abilities[largest]?.mod ?? -Infinity) ? ability : largest
    , availableAbilities.first());
  }

  /* -------------------------------------------- */

  /** @override */
  get criticalThreshold() {
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

  /** @override */
  static get itemCategories() {
    return CONFIG.DND5E.weaponTypes;
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
   * Mastery options that can be used when attacking with this weapon.
   * @type {FormSelectOption[]|null}
   */
  get masteryOptions() {
    if ( !this.parent.actor?.system.traits?.weaponProf?.mastery?.value?.has?.(this.type.baseItem) || !this.mastery ) {
      return null;
    }
    const extras = [];
    for ( const mastery of this.parent.actor.system.traits.weaponProf.mastery.bonus ?? [] ) {
      if ( mastery === this.mastery ) continue;
      extras.push({ value: mastery, label: CONFIG.DND5E.weaponMasteries[mastery]?.label ?? mastery });
    }
    return [{
      value: this.mastery,
      label: CONFIG.DND5E.weaponMasteries[this.mastery]?.label ?? this.mastery,
      rule: !!extras.length
    }, ...extras];
  }

  /* -------------------------------------------- */

  /**
   * Does this item have base damage defined in `damage.base` to offer to an activity?
   * @type {boolean}
   */
  get offersBaseDamage() {
    return true;
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

  /* -------------------------------------------- */

  /**
   * Attack types that can be used with this item by default.
   * @type {Set<string>}
   */
  get validAttackTypes() {
    const types = new Set();
    const attackType = this.attackType;
    if ( (attackType === "melee") || (attackType === null) ) types.add("melee");
    if ( (attackType === "ranged") || this.properties.has("thr")
      || ((attackType === null) && this.range.value) ) types.add("ranged");
    return types;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    await this.preCreateEquipped(data, options, user);
    if ( this.activities.size ) return;

    const activityData = new CONFIG.DND5E.activityTypes.attack.documentClass({}, { parent: this.parent }).toObject();
    this.parent.updateSource({ [`system.activities.${activityData._id}`]: activityData });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    if ( (await super._preUpdate(changed, options, user)) === false ) return false;
    await this.preUpdateIdentifiable(changed, options, user);
  }
}
