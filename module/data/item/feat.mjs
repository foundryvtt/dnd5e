import ItemDataModel from "../abstract/item-data-model.mjs";
import FormulaField from "../fields/formula-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import AdvancementTemplate from "./templates/advancement.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { ItemTypeData } from "./fields/item-type-field.mjs";
 */

/**
 * Data definition for Feature items.
 * @mixes ActivitiesTemplate
 * @mixes AdvancementTemplate
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 *
 * @property {number} cover                         Amount of cover this feature affords to its crew on a vehicle.
 * @property {boolean} crewed                       Is this vehicle feature currently crewed?
 * @property {object} enchant
 * @property {string} enchant.max                   Maximum number of items that can have this enchantment.
 * @property {string} enchant.period                Frequency at which the enchantment can be swapped.
 * @property {object} prerequisites
 * @property {Set<string>} prerequisites.items      Items that must be taken first before this item.
 * @property {number} prerequisites.level           Character or class level required to choose this feature.
 * @property {boolean} prerequisites.repeatable     Can this item be selected more than once?
 * @property {Set<string>} properties               General properties of a feature item.
 * @property {string} requirements                  Actor details required to use this feature.
 * @property {Omit<ItemTypeData, "baseItem">} type  Feature type and subtype.
 */
export default class FeatData extends ItemDataModel.mixin(
  ActivitiesTemplate, AdvancementTemplate, ItemDescriptionTemplate, ItemTypeTemplate
) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.FEATURE", "DND5E.ENCHANTMENT", "DND5E.Prerequisites", "DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      cover: new NumberField({ min: 0, max: 1 }),
      crewed: new BooleanField(),
      enchant: new SchemaField({
        max: new FormulaField({ deterministic: true }),
        period: new StringField()
      }),
      prerequisites: new SchemaField({
        items: new SetField(new IdentifierField()),
        level: new NumberField({ integer: true, min: 0 }),
        repeatable: new BooleanField()
      }),
      properties: new SetField(new StringField()),
      requirements: new StringField({ required: true, nullable: true }),
      type: new ItemTypeField({ baseItem: false })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    enchantable: true,
    hasEffects: true
  }, { inplace: false }));

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["category", {
        label: "DND5E.ITEM.Category.Label",
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
      ["properties", this.compendiumBrowserPropertiesFilter("feat")],
      ["abilityScoreImprovement", {
        label: "DND5E.ADVANCEMENT.AbilityScoreImprovement.Title",
        type: "set",
        config: {
          choices: CONFIG.DND5E.abilities
        },
        createFilter: (filters, value, def) => {
          const { include, exclude } = Object.entries(value).reduce((d, [key, value]) => {
            if ( value === 1 ) d.include.push(key);
            else if ( value === -1 ) d.exclude.push(key);
            return d;
          }, { include: [], exclude: [] });

          const makeFilter = values => ({
            o: "OR", v: [
              ...values.map(ability => ({
                k: "system.advancement", o: "has", v: { k: `configuration.fixed.${ability}`, o: "gt", v: 0 }
              })),
              {
                k: "system.advancement", o: "has", v: {
                  o: "AND", v: [
                    { k: "configuration.points", o: "gt", v: 0 },
                    { o: "NOT", v: { k: "configuration.locked", o: "hasall", v: values } }
                  ]
                }
              }
            ]
          });

          if ( include.length ) filters.push(makeFilter(include));
          if ( exclude.length ) filters.push({ o: "NOT", v: makeFilter(exclude) });
        }
      }]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();

    if ( this.type.value ) {
      const config = CONFIG.DND5E.featureTypes[this.type.value];
      if ( config ) this.type.label = config.subtypes?.[this.type.subtype] ?? null;
      else this.type.label = game.i18n.localize(CONFIG.Item.typeLabels.feat);
    }

    let label;
    const activation = this.activities.contents[0]?.activation.type;
    if ( activation === "legendary" ) label = game.i18n.localize("DND5E.LegendaryAction.Label");
    else if ( activation === "lair" ) label = game.i18n.localize("DND5E.LAIR.Action.Label");
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
    const itemTypes = CONFIG.DND5E.featureTypes[this._source.type.value];
    if ( itemTypes ) {
      context.itemType = itemTypes.label;
      context.itemSubtypes = itemTypes.subtypes;
    }
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
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
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get advancementClassLinked() {
    return this.type.value !== "feat";
  }

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
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Validate the prerequisites specified on this item.
   * @param {Actor5e} actor                        Actor against which the prerequisites should be checked.
   * @param {object} [options={}]
   * @param {Item5e[]} [options.added]             Items that are pending addition to the Actor.
   * @param {number} [options.level]               Level to validate. Falls back to character level.
   * @param {Item5e[]} [options.removed]           Items that are pending removal from the Actor.
   * @param {boolean} [options.showMessage=false]  Show a UI message if the validation fails.
   * @param {boolean} [options.throwError=false]   Throw an error if validation fails.
   * @returns {true|string[]}  True if the item is valid or a list of invalid descriptions if validation failed.
   */
  validatePrerequisites(actor, {
    added=[], level=actor.system?.details?.level, removed=[], showMessage=false, throwError=false
  }={}) {
    const messages = [];

    // Check to ensure the item doesn't already exist on actor if it is not repeatable
    if ( !this.prerequisites.repeatable && actor.sourcedItems?.get(this.parent.uuid)?.size ) {
      messages.push(game.i18n.localize("DND5E.Prerequisites.Warning.NotRepeatable"));
    }

    // If a feature has item pre-requisites, make sure the other items exist on the actor
    const pendingAddition = new Set(added.map(i => i.system.identifier));
    const pendingRemoval = new Set(removed.map(i => i.system.identifier));
    const someExist = !this.prerequisites.items.size || Array.from(this.prerequisites.items).some(i => {
      return (actor.identifiedItems.get(i)?.size || pendingAddition.has(i)) && !pendingRemoval.has(i);
    });
    if ( !someExist ) {
      messages.push(game.i18n.format("DND5E.Prerequisites.Warning.MissingItem", {
        items: game.i18n.getListFormatter({ type: "disjunction" }).format(Array.from(this.prerequisites.items))
      }));
    }

    // If a feature has a level pre-requisite, make sure it is less than or equal to current level
    if ( (this.prerequisites?.level ?? -Infinity) > (level ?? Infinity) ) {
      messages.push(game.i18n.format("DND5E.Prerequisites.Warning.InvalidLevel", {
        level: this.prerequisites.level
      }));
    }

    if ( !messages.length ) return true;

    if ( showMessage || throwError ) {
      const message = game.i18n.format("DND5E.Prerequisites.Warning.Message", {
        actor: actor.name,
        requirements: game.i18n.getListFormatter().format(messages),
        type: game.i18n.localize(CONFIG.Item.typeLabels[this.parent.type]).toLowerCase()
      });
      if ( showMessage ) ui.notifications.warn(message);
      if ( throwError ) throw new Error(message);
    }

    return messages;
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
