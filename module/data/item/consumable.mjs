import SystemDataModel from "../abstract.mjs";
import { MappingField } from "../fields.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import EquippableItemTemplate from "./templates/equippable-item.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import PhysicalItemTemplate from "./templates/physical-item.mjs";

/**
 * Data definition for Consumable items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes PhysicalItemTemplate
 * @mixes EquippableItemTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 *
 * @property {object} uses
 * @property {boolean} uses.autoDestroy  Should this item be destroyed when it runs out of uses.
 */
export default class ConsumableData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, ItemTypeTemplate, PhysicalItemTemplate, EquippableItemTemplate, ActivatedEffectTemplate, ActionTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      properties: new MappingField(new foundry.data.fields.BooleanField(), {
        required: false, label: "DND5E.ItemAmmoProperties"
      }),
      uses: new ActivatedEffectTemplate.ItemUsesField({
        autoDestroy: new foundry.data.fields.BooleanField({required: true, label: "DND5E.ItemDestroyEmpty"})
      }, {label: "DND5E.LimitedUses"})
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
    return [
      CONFIG.DND5E.consumableTypes[this.type.value],
      this.hasLimitedUses ? `${this.uses.value}/${this.uses.max} ${game.i18n.localize("DND5E.Charges")}` : null,
      this.priceLabel
    ];
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  get _typeAbilityMod() {
    if ( this.type.value !== "scroll" ) return null;
    return this.parent?.actor?.system.attributes.spellcasting || "int";
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
}
