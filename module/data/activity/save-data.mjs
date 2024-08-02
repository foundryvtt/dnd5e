import FormulaField from "../fields/formula-field.mjs";
import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { ArrayField, BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {EffectApplicationData} SaveEffectApplicationData
 * @property {string} onSave  Should this effect still be applied on a successful save?
 */

/**
 * Data model for an save activity.
 *
 * @property {string} ability                       Ability used to make the attack and determine damage.
 * @property {object} damage
 * @property {string} damage.onSave                 How much damage is done on a successful save?
 * @property {DamageData[]} damage.parts            Parts of damage to inflict.
 * @property {SaveEffectApplicationData[]} effects  Linked effects that can be applied.
 * @property {object} save
 * @property {object} save.dc
 * @property {string} save.dc.calculation           Method or ability used to calculate the difficulty class.
 * @property {string} save.dc.formula               Custom DC formula or flat value.
 */
export default class SaveActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: new StringField({ initial: () => Object.keys(CONFIG.DND5E.abilities)[0] }),
      damage: new SchemaField({
        onSave: new StringField(),
        parts: new ArrayField(new DamageField())
      }),
      save: new SchemaField({
        dc: new SchemaField({
          calculation: new StringField(),
          formula: new FormulaField({ deterministic: true })
        })
      })
    };
  }

  /* -------------------------------------------- */

  /**
   * Return the fields that will be included in the schema for applied effects.
   * @returns {Record<string, DataField>}
   */
  static defineEffectSchema() {
    return {
      ...super.defineEffectSchema(),
      onSave: new BooleanField()
    };
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data related to this activity.
   */
  prepareData() {
    super.prepareData();
    if ( !this.damage.onSave ) this.damage.onSave = this.isSpell && (this.item.system.level === 0) ? "none" : "half";
    if ( !this.save.dc.calculation ) this.save.dc.calculation = this.isSpell ? "spellcasting" : "custom";
  }
}
