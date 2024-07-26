import { ItemDataModel } from "../abstract.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import { EnchantmentData } from "./fields/enchantment-field.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Feature items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 * @mixes ActivitiesTemplate
 *
 * @property {object} prerequisites
 * @property {number} prerequisites.level           Character or class level required to choose this feature.
 * @property {Set<string>} properties               General properties of a feature item.
 * @property {string} requirements                  Actor details required to use this feature.
 * @property {object} recharge                      Details on how a feature can roll for recharges.
 * @property {number} recharge.value                Minimum number needed to roll on a d6 to recharge this feature.
 * @property {boolean} recharge.charged             Does this feature have a charge remaining?
 */
export default class FeatData extends ItemDataModel.mixin(
  ItemDescriptionTemplate, ItemTypeTemplate, ActivatedEffectTemplate, ActionTemplate, ActivitiesTemplate
) {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.Enchantment", "DND5E.Prerequisites"];

  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({baseItem: false}, {label: "DND5E.ItemFeatureType"}),
      prerequisites: new SchemaField({
        level: new NumberField({integer: true, min: 0})
      }),
      properties: new SetField(new StringField(), {
        label: "DND5E.ItemFeatureProperties"
      }),
      requirements: new StringField({required: true, nullable: true, label: "DND5E.Requirements"})
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["category", {
        label: "DND5E.Item.Category.Label",
        type: "set",
        config: {
          choices: CONFIG.DND5E.featureTypes,
          keyPath: "system.type.value"
        }
      }],
      ["subtype", {
        label: "DND5E.ItemFeatureType",
        type: "set",
        config: {
          choices: Object.values(CONFIG.DND5E.featureTypes).reduce((obj, config) => {
            for ( const [key, label] of Object.entries(config.subtypes ?? {}) ) obj[key] = label;
            return obj;
          }, {}),
          keyPath: "system.type.subtype"
        }
      }],
      ["properties", this.compendiumBrowserPropertiesFilter("feat")]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    if ( this.type.value ) {
      const config = CONFIG.DND5E.featureTypes[this.type.value];
      if ( config ) this.type.label = config.subtypes?.[this.type.subtype] ?? null;
      else this.type.label = game.i18n.localize(CONFIG.Item.typeLabels.feat);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivatedEffectData();
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));

    const uses = this.uses;
    this.recharge ??= {};
    Object.defineProperty(this.recharge, "value", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "Recharge data has been merged into uses data. Recharge state can now be determined by checking whether"
          + " `system.uses.period` is `recharge` and the recharge value can be found at `system.uses.formula`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4" }
        );
        return uses.period === "recharge" ? Number(uses.formula) : null;
      }
    });
    Object.defineProperty(this.recharge, "charged", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "Recharge data has been merged into uses data. Determining charged state can now be done by determining"
          + " whether `system.uses.value` is greater than `0`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4" }
        );
        return uses.value > 0;
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: [this.parent.labels.activation, this.parent.labels.recovery],
      uses: this.hasLimitedUses ? this.getUsesData() : null
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    FeatData.#migrateType(source);
    FeatData.#migrateRecharge(source);
  }

  /* -------------------------------------------- */

  /**
   * Ensure feats have a type object.
   * @param {object} source The candidate source data from which the model will be constructed.
   */
  static #migrateType(source) {
    if ( !("type" in source) ) return;
    if ( !source.type ) source.type = {value: "", subtype: ""};
  }

  /* -------------------------------------------- */

  /**
   * Migrate 0 values to null.
   * @param {object} source The candidate source data from which the model will be constructed.
   */
  static #migrateRecharge(source) {
    if ( !("recharge" in source) ) return;
    const value = source.recharge.value;
    if ( (value === 0) || (value === "") ) source.recharge.value = null;
    else if ( (typeof value === "string") && Number.isNumeric(value) ) source.recharge.value = Number(value);
    if ( source.recharge.charged === null ) source.recharge.charged = false;
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [this.requirements];
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed on the item card.
   * @type {string[]}
   */
  get cardProperties() {
    return [this.requirements];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get hasLimitedUses() {
    return this.isActive && (!!this.recharge.value || super.hasLimitedUses);
  }

  /* -------------------------------------------- */

  /**
   * Does this feature represent a group of individual enchantments (e.g. the "Infuse Item" feature stores data about
   * all of the character's infusions).
   * @type {boolean}
   */
  get isEnchantmentSource() {
    return EnchantmentData.isEnchantmentSource(this);
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    return 1;
  }
}
