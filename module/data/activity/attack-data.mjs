import FormulaField from "../fields/formula-field.mjs";
import DamageField from "../shared/damage-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const { ArrayField, BooleanField, SchemaField, StringField } = foundry.data.fields;

/**
 * Data model for an attack activity.
 *
 * @property {string} ability                     Ability used to make the attack and determine damage.
 * @property {object} attack
 * @property {string} attack.bonus                Arbitrary bonus added to the attack.
 * @property {boolean} attack.flat                Should the bonus be used in place of proficiency & ability modifier?
 * @property {object} attack.type
 * @property {string} attack.type.value           Is this a melee or ranged attack?
 * @property {string} attack.type.classification  Is this a unarmed, weapon, or spell attack?
 * @property {object} damage
 * @property {boolean} damage.includeBase         Should damage defined by the item be included with other damage parts?
 * @property {DamageData[]} damage.parts          Parts of damage to inflict.
 */
export default class AttackActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ability: new StringField(),
      attack: new SchemaField({
        bonus: new FormulaField(),
        flat: new BooleanField(),
        type: new SchemaField({
          value: new StringField(),
          classification: new StringField()
        })
      }),
      damage: new SchemaField({
        includeBase: new BooleanField({ initial: true }),
        parts: new ArrayField(new DamageField())
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    return foundry.utils.mergeObject(activityData, {
      ability: source.system.ability ?? "",
      attack: {
        bonus: source.system.attack?.bonus ?? "",
        flat: source.system.attack?.flat ?? false,
        type: {
          value: source.system.actionType.startsWith("m") ? "melee" : "ranged",
          classification: source.system.actionType.endsWith("wak") ? "weapon" : "spell"
        }
      },
      damage: {
        includeBase: true,
        parts: source.system.damage?.parts?.map(part => this.transformDamagePartData(source, part)) ?? []
      }
    });
  }
}
