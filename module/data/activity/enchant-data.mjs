import IdentifierField from "../fields/identifier-field.mjs";
import BaseActivityData from "./base-activity.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @typedef {EffectApplicationData} EnchantEffectApplicationData
 * @property {object} level
 * @property {number} level.min        Minimum level at which this profile can be used.
 * @property {number} level.max        Maximum level at which this profile can be used.
 * @property {object} riders
 * @property {string[]} riders.effect  IDs of other effects on this item that will be added with this enchantment.
 * @property {string[]} riders.item    UUIDs of items that will be added with this enchantment.
 */

/**
 * Data model for a enchant activity.
 *
 * @property {object} enchant
 * @property {string} enchant.identifier    Class identifier that will be used to determine applicable level.
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical  Allow enchantments to be applied to items that are already magical.
 * @property {string} restrictions.type           Item type to which this enchantment can be applied.
 */
export default class EnchantActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      effects: new ArrayField(new AppliedEffectField({
        level: new SchemaField({
          min: new NumberField({ min: 0, integer: true }),
          max: new NumberField({ min: 0, integer: true })
        }),
        riders: new SchemaField({
          effect: new SetField(new DocumentIdField()),
          item: new SetField(new DocumentUUIDField())
        })
      })),
      enchant: new SchemaField({
        identifier: new IdentifierField()
      }),
      restrictions: new SchemaField({
        allowMagical: new BooleanField(),
        type: new StringField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformEffectsData(source) {
    const effects = [];
    for ( const effect of source.effects ) {
      if ( (effect.type !== "enchantment") && (effect.flags?.dnd5e?.type !== "enchantment") ) continue;
      effects.push({ _id: effect._id, ...(effect.flags?.dnd5e?.enchantment ?? {}) });
      delete effect.flags?.dnd5e?.enchantment;
    }
    return effects;
  }

  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData) {
    return foundry.utils.mergeObject(activityData, {
      enchant: {
        identifier: source.system.enchantment?.classIdentifier ?? ""
      },
      restrictions: source.system.enchantment?.restrictions ?? []
    });
  }
}
