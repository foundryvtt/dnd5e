import { ItemDataModel } from "../abstract.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";
import { FormulaField } from "../fields/_module.mjs";

const { NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Feature items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 *
 * @property {object} enchant
 * @property {string} enchant.max                   Maximum number of items that can have this enchantment.
 * @property {string} enchant.period                Frequency at which the enchantment can be swapped.
 * @property {object} prerequisites
 * @property {number} prerequisites.level           Character or class level required to choose this feature.
 * @property {Set<string>} properties               General properties of a feature item.
 * @property {string} requirements                  Actor details required to use this feature.
 */
export default class FeatData extends ItemDataModel.mixin(
  ActivitiesTemplate, ItemDescriptionTemplate, ItemTypeTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ENCHANTMENT", "DND5E.Prerequisites", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      enchant: new SchemaField({
        max: new FormulaField({deterministic: true}),
        period: new StringField()
      }),
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
    ActivitiesTemplate._applyActivityShims.call(this);
    super.prepareDerivedData();
    this.prepareDescriptionData();

    if ( this.type.value ) {
      const config = CONFIG.DND5E.featureTypes[this.type.value];
      if ( config ) this.type.label = config.subtypes?.[this.type.subtype] ?? null;
      else this.type.label = game.i18n.localize(CONFIG.Item.typeLabels.feat);
    }

    let label;
    const activation = this.activities.contents[0]?.activation.type;
    if ( activation === "legendary" ) label = game.i18n.localize("DND5E.LegendaryActionLabel");
    else if ( activation === "lair" ) label = game.i18n.localize("DND5E.LairActionLabel");
    else if ( activation === "action" && this.hasAttack ) label = game.i18n.localize("DND5E.Attack");
    else if ( activation ) label = game.i18n.localize("DND5E.Action");
    else label = game.i18n.localize("DND5E.Passive");
    this.parent.labels ??= {};
    this.parent.labels.featType = label;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));

    const uses = this.uses;
    this.recharge ??= {};
    Object.defineProperty(this.recharge, "value", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "Recharge data has been merged into uses data. Recharge state can now be determined by checking"
          + " `system.uses.recovery` for a profile with a `period` of 'recharge', and checking its `formula` for the"
          + " recharge formula.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4" }
        );
        return uses.period === "recharge" ? Number(uses.formula) : null;
      },
      configurable: true
    });
    Object.defineProperty(this.recharge, "charged", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "Recharge data has been merged into uses data. Determining charged state can now be done by determining"
          + " whether `system.uses.value` is greater than `0`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4" }
        );
        return uses.value > 0;
      },
      configurable: true
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

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: this.type.label },
      { label: this.parent.labels.featType },
      { label: this.requirements, value: this._source.requirements, field: this.schema.getField("requirements"),
        placeholder: "DND5E.Requirements" }
    ];
    context.parts = ["dnd5e.details-feat", "dnd5e.field-uses"];
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    FeatData.#migrateEnchantment(source);
    ActivitiesTemplate.migrateActivities(source);
    FeatData.#migrateType(source);
    FeatData.#migrateRecharge(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate enchantment data format.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateEnchantment(source) {
    if ( foundry.utils.getType(source.enchantment?.items) !== "Object" ) return;
    const { items } = source.enchantment;
    source.enchant ??= {};
    if ( "max" in items ) source.enchant.max = items.max;
    if ( "period" in items ) source.enchant.period = items.period;
    delete source.enchantment.items;
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

  /**
   * Does this feature represent a group of individual enchantments (e.g. the "Infuse Item" feature stores data about
   * all of the character's infusions).
   * @type {boolean}
   */
  get isEnchantmentSource() {
    return CONFIG.DND5E.featureTypes[this.type?.value]?.subtypes?.[this.type?.subtype]
      && (this.type?.subtype in CONFIG.DND5E.featureTypes.enchantment.subtypes);
  }

  /* -------------------------------------------- */

  /**
   * The proficiency multiplier for this item.
   * @returns {number}
   */
  get proficiencyMultiplier() {
    return 1;
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;

    // Set type as "Monster Feature" if created directly on a NPC
    if ( (this.parent.actor?.type === "npc") && !foundry.utils.hasProperty(data, "system.type.value") ) {
      this.updateSource({ "type.value": "monster" });
    }
  }
}
