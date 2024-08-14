import { simplifyBonus } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";

const { ArrayField, BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * @typedef {EffectApplicationData} SaveEffectApplicationData
 * @property {boolean} onSave  Should this effect still be applied on a successful save?
 */

/**
 * Data model for an save activity.
 *
 * @property {object} damage
 * @property {string} damage.onSave                 How much damage is done on a successful save?
 * @property {DamageData[]} damage.parts            Parts of damage to inflict.
 * @property {SaveEffectApplicationData[]} effects  Linked effects that can be applied.
 * @property {object} save
 * @property {string} save.ability                  Make the saving throw with this ability.
 * @property {object} save.dc
 * @property {string} save.dc.calculation           Method or ability used to calculate the difficulty class.
 * @property {string} save.dc.formula               Custom DC formula or flat value.
 */
export default class SaveActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new SchemaField({
        onSave: new StringField(),
        parts: new ArrayField(new DamageField())
      }),
      effects: new ArrayField(new AppliedEffectField({
        onSave: new BooleanField()
      })),
      save: new SchemaField({
        ability: new StringField({ initial: () => Object.keys(CONFIG.DND5E.abilities)[0] }),
        dc: new SchemaField({
          calculation: new StringField(),
          formula: new FormulaField({ deterministic: true })
        })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get ability() {
    if ( this.save.dc.calculation in CONFIG.DND5E.abilities ) return this.save.dc.calculation;
    if ( this.save.dc.calculation === "spellcasting" ) {
      let ability = this.isSpell ? this.item.system.availableAbilities?.first() : null;
      ability ??= this.actor?.system.attributes?.spellcasting;
      return ability ?? null;
    }
    return this.save.ability;
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    let calculation = source.system.save?.scaling;
    if ( calculation === "flat" ) calculation = "custom";
    else if ( calculation === "spell" ) calculation = "spellcasting";

    return foundry.utils.mergeObject(activityData, {
      damage: {
        onSave: (source.type === "spell") && (source.system.level === 0) ? "none" : "half",
        parts: source.system.damage?.parts?.map(part => this.transformDamagePartData(source, part)) ?? []
      },
      save: {
        ability: source.system.save?.ability ?? Object.keys(CONFIG.DND5E.abilities)[0],
        dc: {
          calculation,
          formula: String(source.system.save?.dc ?? "")
        }
      }
    });
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

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });
    super.prepareFinalData(rollData);
    this.prepareDamageLabel(this.damage.parts, rollData);

    let ability;
    if ( this.save.dc.calculation === "custom" ) this.save.dc.value = simplifyBonus(this.save.dc.formula, rollData);
    else ability = this.ability;
    if ( ability ) this.save.dc.value = this.actor?.system.abilities?.[ability]?.dc
      ?? 8 + (this.actor?.system.attributes?.prof ?? 0);

    if ( this.save.dc.value ) this.labels.save = game.i18n.format("DND5E.SaveDC", {
      dc: this.save.dc.value,
      ability: CONFIG.DND5E.abilities[ability]?.label ?? ""
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /** @inheritDoc */
  getDamageConfig(config={}) {
    const rollConfig = super.getDamageConfig(config);

    rollConfig.critical ??= {};
    rollConfig.critical.allow ??= false;

    return rollConfig;
  }
}
