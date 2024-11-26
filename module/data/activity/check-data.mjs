import { simplifyBonus } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * @import { CheckActivityData } from "./_types.mjs";
 */

/**
 * Data model for a check activity.
 * @extends {BaseActivityData<CheckActivityData>}
 * @mixes CheckActivityData
 */
export default class BaseCheckActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      check: new SchemaField({
        ability: new StringField(),
        associated: new SetField(new StringField()),
        bonus: new FormulaField(),
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
    if ( this.check.dc.calculation in CONFIG.DND5E.abilities ) return this.check.dc.calculation;
    if ( this.check.dc.calculation === "spellcasting" ) return this.spellcastingAbility;
    return this.check.ability;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData, options) {
    return foundry.utils.mergeObject(activityData, {
      check: {
        ability: source.system.ability ?? Object.keys(CONFIG.DND5E.abilities)[0]
      }
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });
    super.prepareFinalData(rollData);

    if ( this.check.ability === "spellcasting" ) this.check.ability = this.spellcastingAbility;

    let ability;
    if ( this.check.dc.calculation ) ability = this.ability;
    else this.check.dc.value = simplifyBonus(this.check.dc.formula, rollData);
    if ( ability ) this.check.dc.value = this.actor?.system.abilities?.[ability]?.dc
      ?? 8 + (this.actor?.system.attributes?.prof ?? 0);

    if ( !this.check.dc.value ) this.check.dc.value = null;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Get the ability to use with an associated value.
   * @param {string} associated  Skill or tool ID.
   * @returns {string|null}      Ability to use.
   */
  getAbility(associated) {
    if ( this.check.ability ) return this.check.ability;
    if ( associated in CONFIG.DND5E.skills ) return CONFIG.DND5E.skills[associated]?.ability ?? null;
    else if ( associated in CONFIG.DND5E.tools ) {
      if ( (this.item.type === "tool") && this.item.system.ability ) return this.item.system.ability;
      return CONFIG.DND5E.tools[associated]?.ability ?? null;
    }
    return null;
  }
}
