import SystemDataModel from "../abstract.mjs";
import ActionTemplate from "./templates/action.mjs";
import ActivatedEffectTemplate from "./templates/activated-effect.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";
import ItemTypeTemplate from "./templates/item-type.mjs";
import ItemTypeField from "./fields/item-type-field.mjs";


/**
 * Data definition for Feature items.
 * @mixes ItemDescriptionTemplate
 * @mixes ItemTypeTemplate
 * @mixes ActivatedEffectTemplate
 * @mixes ActionTemplate
 *
 * @property {string} requirements       Actor details required to use this feature.
 * @property {object} recharge           Details on how a feature can roll for recharges.
 * @property {number} recharge.value     Minimum number needed to roll on a d6 to recharge this feature.
 * @property {boolean} recharge.charged  Does this feature have a charge remaining?
 */
export default class FeatData extends SystemDataModel.mixin(
  ItemDescriptionTemplate, ItemTypeTemplate, ActivatedEffectTemplate, ActionTemplate
) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new ItemTypeField({}, { label: "DND5E.ItemFeatureType" }),
      properties: new SetField(new foundry.data.fields.StringField()),
      requirements: new foundry.data.fields.StringField({required: true, nullable: true, label: "DND5E.Requirements"}),
      recharge: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          required: true, integer: true, min: 1, label: "DND5E.FeatureRechargeOn"
        }),
        charged: new foundry.data.fields.BooleanField({required: true, label: "DND5E.Charged"})
      }, {label: "DND5E.FeatureActionRecharge"})
    });
  }

  /* -------------------------------------------- */
  /*  Migrations                                  */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
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

  /** @inheritdoc */
  get hasLimitedUses() {
    return this.isActive && (!!this.recharge.value || super.hasLimitedUses);
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
