import { simplifyBonus } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;

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
        ability: new SetField(new StringField()),
        associated: new SetField(new StringField()),
        bonus: new FormulaField(),
        dc: new SchemaField({
          calculation: new StringField(),
          formula: new FormulaField({ deterministic: true })
        }),
        visible: new BooleanField({ initial: true })
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
    return this.abilities.first() ?? null;
  }

  /* -------------------------------------------- */

  /**
   * The abilities allowed by this check.
   * @type {Set<string>}
   */
  get abilities() {
    const values = foundry.utils.getType(this.check.ability) === "string"
      ? [this.check.ability]
      : this.check.ability;
    const abilities = new Set(values);
    if ( abilities.delete("spellcasting") && this.spellcastingAbility ) abilities.add(this.spellcastingAbility);
    return abilities;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( foundry.utils.getType(source.check?.ability) === "string" ) {
      if ( source.check.ability ) source.check.ability = [source.check.ability];
      else source.check.ability = [];
    }
    return source;
  }

  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData, options) {
    return foundry.utils.mergeObject(activityData, {
      check: {
        ability: [source.system.ability ?? Object.keys(CONFIG.DND5E.abilities)[0]]
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

    if ( this.check.ability.delete("spellcasting") && this.spellcastingAbility ) {
      this.check.ability.add(this.spellcastingAbility);
    }

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
    if ( this.abilities.size ) return this.abilities.first() ?? null;
    if ( associated in CONFIG.DND5E.skills ) return CONFIG.DND5E.skills[associated]?.ability ?? null;
    else if ( associated in CONFIG.DND5E.tools ) {
      if ( (this.item.type === "tool") && this.item.system.ability ) return this.item.system.ability;
      return CONFIG.DND5E.tools[associated]?.ability ?? null;
    }
    return null;
  }
}
