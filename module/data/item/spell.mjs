import { filteredKeys } from "../../utils.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { FormulaField } from "../fields.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

/**
 * Data definition for Spell items.
 * @mixes ItemDescriptionTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 * @mixes ActivitiesTemplate
 *
 * @property {number} level                      Base level of the spell.
 * @property {string} school                     Magical school to which this spell belongs.
 * @property {Set<string>} properties            General components and tags for this spell.
 * @property {object} materials                  Details on material components required for this spell.
 * @property {string} materials.value            Description of the material components required for casting.
 * @property {boolean} materials.consumed        Are these material components consumed during casting?
 * @property {number} materials.cost             GP cost for the required components.
 * @property {number} materials.supply           Quantity of this component available.
 * @property {object} preparation                Details on how this spell is prepared.
 * @property {string} preparation.mode           Spell preparation mode as defined in `DND5E.spellPreparationModes`.
 * @property {boolean} preparation.prepared      Is the spell currently prepared?
 * @property {object} scaling                    Details on how casting at higher levels affects this spell.
 * @property {string} scaling.mode               Spell scaling mode as defined in `DND5E.spellScalingModes`.
 * @property {string} scaling.formula            Dice formula used for scaling.
 */
export default class SpellData extends ItemDataModel.mixin(
  ItemDescriptionTemplate, ActivatedEffectTemplate, ActionTemplate, ActivitiesTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      level: new foundry.data.fields.NumberField({
        required: true, integer: true, initial: 1, min: 0, label: "DND5E.SpellLevel"
      }),
      school: new foundry.data.fields.StringField({required: true, label: "DND5E.SpellSchool"}),
      sourceClass: new foundry.data.fields.StringField({label: "DND5E.SpellSourceClass"}),
      properties: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        label: "DND5E.SpellComponents"
      }),
      materials: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.StringField({required: true, label: "DND5E.SpellMaterialsDescription"}),
        consumed: new foundry.data.fields.BooleanField({required: true, label: "DND5E.SpellMaterialsConsumed"}),
        cost: new foundry.data.fields.NumberField({
          required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsCost"
        }),
        supply: new foundry.data.fields.NumberField({
          required: true, initial: 0, min: 0, label: "DND5E.SpellMaterialsSupply"
        })
      }, {label: "DND5E.SpellMaterials"}),
      preparation: new foundry.data.fields.SchemaField({
        mode: new foundry.data.fields.StringField({
          required: true, initial: "prepared", label: "DND5E.SpellPreparationMode"
        }),
        prepared: new foundry.data.fields.BooleanField({required: true, label: "DND5E.SpellPrepared"})
      }, {label: "DND5E.SpellPreparation"}),
      scaling: new foundry.data.fields.SchemaField({
        mode: new foundry.data.fields.StringField({required: true, initial: "none", label: "DND5E.ScalingMode"}),
        formula: new FormulaField({required: true, nullable: true, initial: null, label: "DND5E.ScalingFormula"})
      }, {label: "DND5E.LevelScaling"})
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

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ActivitiesTemplate.migrateActivities(source);
    SpellData.#migrateScaling(source);
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
   * Migrate spell scaling.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateScaling(source) {
    if ( !("scaling" in source) ) return;
    if ( (source.scaling.mode === "") || (source.scaling.mode === null) ) source.scaling.mode = "none";
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.properties.add("mgc");
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData() {
    this.prepareFinalActivatedEffectData();
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
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
}
