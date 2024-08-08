import { filteredKeys } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import ActivationField from "../shared/activation-field.mjs";
import DurationField from "../shared/duration-field.mjs";
import RangeField from "../shared/range-field.mjs";
import TargetField from "../shared/target-field.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { BooleanField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * Data definition for Spell items.
 * @mixes ActivitiesTemplate
 * @mixes ItemDescriptionTemplate
 *
 * @property {ActivationData} activation         Casting time & conditions.
 * @property {DurationData} duration             Duration of the spell effect.
 * @property {number} level                      Base level of the spell.
 * @property {object} materials                  Details on material components required for this spell.
 * @property {string} materials.value            Description of the material components required for casting.
 * @property {boolean} materials.consumed        Are these material components consumed during casting?
 * @property {number} materials.cost             GP cost for the required components.
 * @property {number} materials.supply           Quantity of this component available.
 * @property {object} preparation                Details on how this spell is prepared.
 * @property {string} preparation.mode           Spell preparation mode as defined in `DND5E.spellPreparationModes`.
 * @property {boolean} preparation.prepared      Is the spell currently prepared?
 * @property {Set<string>} properties            General components and tags for this spell.
 * @property {RangeData} range                   Range of the spell
 * @property {object} scaling                    Details on how casting at higher levels affects this spell.
 * @property {string} scaling.mode               Spell scaling mode as defined in `DND5E.spellScalingModes`.
 * @property {string} scaling.formula            Dice formula used for scaling.
 * @property {string} school                     Magical school to which this spell belongs.
 * @property {string} sourceClass                Associated spellcasting class when this spell is on an actor.
 * @property {TargetData} target                 Information on area and individual targets.
 */
export default class SpellData extends ItemDataModel.mixin(ActivitiesTemplate, ItemDescriptionTemplate) {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "DND5E.ACTIVATION", "DND5E.DURATION", "DND5E.RANGE", "DND5E.TARGET"
  ];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      activation: new ActivationField(),
      duration: new DurationField(),
      level: new NumberField({ required: true, integer: true, initial: 1, min: 0, label: "DND5E.SpellLevel" }),
      materials: new SchemaField({
        value: new StringField({ required: true, label: "DND5E.SpellMaterialsDescription" }),
        consumed: new BooleanField({ required: true, label: "DND5E.SpellMaterialsConsumed" }),
        cost: new NumberField({ required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsCost" }),
        supply: new NumberField({ required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsSupply" })
      }, { label: "DND5E.SpellMaterials" }),
      preparation: new SchemaField({
        mode: new StringField({ required: true, initial: "prepared", label: "DND5E.SpellPreparationMode" }),
        prepared: new BooleanField({ required: true, label: "DND5E.SpellPrepared" })
      }, { label: "DND5E.SpellPreparation" }),
      properties: new SetField(new StringField(), { label: "DND5E.SpellComponents" }),
      range: new RangeField(),
      school: new StringField({ required: true, label: "DND5E.SpellSchool" }),
      sourceClass: new StringField({ label: "DND5E.SpellSourceClass" }),
      target: new TargetField()
    });
  }

  /* -------------------------------------------- */

  /** @override */
  static get compendiumBrowserFilters() {
    return new Map([
      ["level", {
        label: "DND5E.Level",
        type: "range",
        config: {
          keyPath: "system.level",
          min: 0,
          max: Object.keys(CONFIG.DND5E.spellLevels).length - 1
        }
      }],
      ["school", {
        label: "DND5E.School",
        type: "set",
        config: {
          choices: CONFIG.DND5E.spellSchools,
          keyPath: "system.school"
        }
      }],
      ["properties", this.compendiumBrowserPropertiesFilter("spell")]
    ]);
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    SpellData.#migrateActivation(source);
    SpellData.#migrateTarget(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the component object to be 'properties' instead.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static _migrateComponentData(source) {
    const components = filteredKeys(source.system?.components ?? {});
    if ( components.length ) {
      foundry.utils.setProperty(source, "flags.dnd5e.migratedProperties", components);
    }
  }

  /* -------------------------------------------- */

  /**
   * Migrate activation data.
   * Added in DnD5e 4.0.0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateActivation(source) {
    if ( source.activation?.cost ) source.activation.value = source.activation.cost;
  }

  /* -------------------------------------------- */

  /**
   * Migrate target data.
   * Added in DnD5e 4.0.0.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateTarget(source) {
    if ( !("target" in source) ) return;
    source.target.affects ??= {};
    source.target.template ??= {};

    if ( "units" in source.target ) source.target.template.units = source.target.units;
    if ( "width" in source.target ) source.target.template.width = source.target.width;

    const type = source.target.type ?? source.target.template.type ?? source.target.affects.type;
    if ( type in CONFIG.DND5E.areaTargetTypes ) {
      if ( "type" in source.target ) source.target.template.type = type;
      if ( "value" in source.target ) source.target.template.size = source.target.value;
    } else if ( type in CONFIG.DND5E.individualTargetTypes ) {
      if ( "type" in source.target ) source.target.affects.type = type;
      if ( "value" in source.target ) source.target.affects.count = source.target.value;
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    ActivitiesTemplate._applyActivityShims.call(this);
    this._applySpellShims();
    super.prepareDerivedData();
    this.properties.add("mgc");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const labels = this.parent.labels ?? {};
    ActivationField.prepareData.call(this, rollData, labels);
    DurationField.prepareData.call(this, rollData, labels);
    RangeField.prepareData.call(this, rollData, labels);
    TargetField.prepareData.call(this, rollData, labels);
    this.prepareFinalActivityData(rollData);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getCardData(enrichmentOptions={}) {
    const context = await super.getCardData(enrichmentOptions);
    context.isSpell = true;
    context.subtitle = [this.parent.labels.level, CONFIG.DND5E.spellSchools[this.school]?.label].filterJoin(" &bull; ");
    context.properties = context.tags;
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: [this.parent.labels.components.vsm, this.parent.labels.activation],
      modifier: this.parent.labels.modifier,
      range: this.range,
      save: this.save
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getSheetData(context) {
    context.subtitles = [
      { label: context.labels.level },
      { label: context.labels.school },
      { label: context.itemStatus }
    ];
    context.properties.active = this.parent.labels?.components?.tags;
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
      this.parent.labels.level,
      this.parent.labels.components.vsm + (this.parent.labels.materials ? ` (${this.parent.labels.materials})` : ""),
      ...this.parent.labels.components.tags
    ];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeAbilityMod() {
    return this.parent?.actor?.spellcastingClasses[this.sourceClass]?.spellcasting.ability
      ?? this.parent?.actor?.system.attributes?.spellcasting
      ?? "int";
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeCriticalThreshold() {
    return this.parent?.actor?.flags.dnd5e?.spellCriticalThreshold ?? Infinity;
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
  /*  Shims                                       */
  /* -------------------------------------------- */

  /**
   * Add additional data shims for spells.
   */
  _applySpellShims() {
    Object.defineProperty(this.activation, "cost", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `activation.cost` property on `SpellData` has been renamed `activation.value`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return this.value;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this, "scaling", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `scaling` property on `SpellData` has been deprecated and is now handled by individual damage parts.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return { mode: "none", formula: null };
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "value", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.value` property on `SpellData` has been split into `target.template.size` and `target.affects.count`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return this.template.size || this.affects.count;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "width", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.width` property on `SpellData` has been moved to `target.template.width`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return this.template.width;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "units", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.units` property on `SpellData` has been moved to `target.template.units`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return this.template.units;
      },
      configurable: true,
      enumerable: false
    });
    Object.defineProperty(this.target, "type", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.type` property on `SpellData` has been split into `target.template.type` and `target.affects.type`.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return this.template.type || this.affects.type;
      },
      configurable: true,
      enumerable: false
    });
    const firstActivity = this.activities.contents[0] ?? {};
    Object.defineProperty(this.target, "prompt", {
      get() {
        foundry.utils.logCompatibilityWarning(
          "The `target.prompt` property on `SpellData` has moved into its activity.",
          { since: "DnD5e 4.0", until: "DnD5e 4.4", once: true }
        );
        return firstActivity.target?.prompt;
      },
      configurable: true,
      enumerable: false
    });
  }
}
