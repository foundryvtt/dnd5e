import { simplifyBonus } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for a check activity.
 *
 * @property {object} check
 * @property {string} check.ability         Ability used with the check.
 * @property {string} check.associated      Skill or tool that can contribute to the check.
 * @property {object} check.dc
 * @property {string} check.dc.calculation  Method or ability used to calculate the difficulty class of the check.
 * @property {string} check.dc.formula      Custom DC formula or flat value.
 */
export default class CheckActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      check: new SchemaField({
        ability: new StringField(),
        associated: new StringField(),
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
    if ( this.check.dc.calculation === "spellcasting" ) {
      let ability = this.isSpell ? this.item.system.availableAbilities?.first() : null;
      ability ??= this.actor?.system.attributes?.spellcasting;
      return ability ?? null;
    }
    return this.check.ability;
  }

  /* -------------------------------------------- */

  /**
   * Is this a flat ability check, skill check, or tool check?
   * @type {"ability"|"skill"|"tool"}
   */
  get checkType() {
    if ( this.check.associated in CONFIG.DND5E.skills ) return "skill";
    if ( this.check.associated in CONFIG.DND5E.toolIds ) return "tool";
    return "ability";
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
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
  prepareData() {
    super.prepareData();
    if ( !this.check.ability && (this.item.type !== "tool") ) {
      this.check.ability = Object.keys(CONFIG.DND5E.abilities)[0];
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    rollData ??= this.getRollData({ deterministic: true });
    super.prepareFinalData(rollData);

    if ( this.item.type === "tool" ) {
      if ( !this.check.associated ) this.check.associated = this.item.system.type.baseItem;
      if ( !this.check.ability ) this.check.ability = this.item.system.ability
        || this.actor?.system.tools?.[this.check.associated]?.ability
        || Object.keys(CONFIG.DND5E.abilities)[0];
    }

    let ability;
    if ( !this.check.dc.calculation ) this.check.dc.value = simplifyBonus(this.check.dc.formula, rollData);
    else ability = this.ability;
    if ( ability ) this.check.dc.value = this.actor?.system.abilities?.[ability]?.dc
      ?? 8 + (this.actor?.system.attributes?.prof ?? 0);

    if ( !this.check.dc.value ) this.check.dc.value = null;
  }
}
