import { ItemDataModel } from "../abstract.mjs";
import { FormulaField } from "../fields.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import IdentifiableTemplate from "./templates/identifiable.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";

/**
 * Data definition for Tool items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes IdentifiableTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 *
 * @property {string} ability     Default ability when this tool is being used.
 * @property {string} chatFlavor  Additional text added to chat when this tool is used.
 * @property {number} proficient  Level of proficiency in this tool as defined in `DND5E.proficiencyLevels`.
 * @property {string} bonus       Bonus formula added to tool rolls.
 */
export default class ToolData extends ItemDataModel.mixin(
  ItemDescriptionTemplate, IdentifiableTemplate, ItemTypeTemplate, PhysicalItemTemplate, EquippableItemTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({subtype: false}, {label: "DND5E.ItemToolType"}),
      ability: new foundry.data.fields.StringField({
        required: true, blank: true, label: "DND5E.DefaultAbilityCheck"
      }),
      chatFlavor: new foundry.data.fields.StringField({required: true, label: "DND5E.ChatFlavor"}),
      proficient: new foundry.data.fields.NumberField({
        required: true, initial: null, min: 0, max: 2, step: 0.5, label: "DND5E.ItemToolProficiency"
      }),
      properties: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        label: "DND5E.ItemToolProperties"
      }),
      bonus: new FormulaField({required: true, label: "DND5E.ItemToolBonus"})
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    ToolData.#migrateAbility(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate the ability field.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateAbility(source) {
    if ( Array.isArray(source.ability) ) source.ability = source.ability[0];
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.type.label = CONFIG.DND5E.toolTypes[this.type.value] ?? game.i18n.localize(CONFIG.Item.typeLabels.tool);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async getFavoriteData() {
    return foundry.utils.mergeObject(await super.getFavoriteData(), {
      subtitle: this.type.label,
      modifier: this.parent.parent?.system.tools?.[this.type.baseItem]?.total
    });
  }

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Properties displayed in chat.
   * @type {string[]}
   */
  get chatProperties() {
    return [CONFIG.DND5E.abilities[this.ability]?.label];
  }

  /* -------------------------------------------- */

  /**
   * Properties displayed in the item tooltip.
   * @type {string[]}
   */
  get tooltipProperties() {
    return [CONFIG.DND5E.abilities[this.ability]?.label];
  }

  /* -------------------------------------------- */

  /**
   * Which ability score modifier is used by this item?
   * @type {string|null}
   */
  get abilityMod() {
    return this.ability || "int";
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
    if ( actor.type === "npc" ) return 1;
    const baseItemProf = actor.system.tools?.[this.type.baseItem];
    const categoryProf = actor.system.tools?.[this.type.value];
    return Math.max(baseItemProf?.value ?? 0, categoryProf?.value ?? 0);
  }
}
