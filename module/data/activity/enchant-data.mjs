import IdentifierField from "../fields/identifier-field.mjs";
import BaseActivityData from "./base-activity.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @typedef {EffectApplicationData} EnchantEffectApplicationData
 * @property {object} level
 * @property {number} level.min             Minimum level at which this profile can be used.
 * @property {number} level.max             Maximum level at which this profile can be used.
 * @property {object} riders
 * @property {Set<string>} riders.activity  IDs of other activities on this item that will be added when enchanting.
 * @property {Set<string>} riders.effect    IDs of other effects on this item that will be added when enchanting.
 * @property {Set<string>} riders.item      UUIDs of items that will be added with this enchantment.
 */

/**
 * Data model for a enchant activity.
 *
 * @property {object} enchant
 * @property {string} enchant.identifier    Class identifier that will be used to determine applicable level.
 * @property {string} enchant.self          Automatically apply enchantment to item containing this activity when used.
 * @property {object} restrictions
 * @property {boolean} restrictions.allowMagical    Allow enchantments to be applied to items that are already magical.
 * @property {Set<string>} restrictions.categories  Item categories to restrict to.
 * @property {Set<string>} restrictions.properties  Item properties to restrict to.
 * @property {string} restrictions.type             Item type to which this enchantment can be applied.
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
          activity: new SetField(new DocumentIdField()),
          effect: new SetField(new DocumentIdField()),
          item: new SetField(new DocumentUUIDField({ type: "Item" }))
        })
      })),
      enchant: new SchemaField({
        identifier: new IdentifierField(),
        self: new BooleanField()
      }),
      restrictions: new SchemaField({
        allowMagical: new BooleanField(),
        categories: new SetField(new StringField()),
        properties: new SetField(new StringField()),
        type: new StringField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get actionType() {
    return "ench";
  }

  /* -------------------------------------------- */

  /** @override */
  get applicableEffects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Enchantments that have been applied by this activity.
   * @type {ActiveEffect5e[]}
   */
  get appliedEnchantments() {
    return dnd5e.registry.enchantments.applied(this.uuid);
  }

  /* -------------------------------------------- */

  /**
   * Enchantments that can be applied based on spell/character/class level.
   * @type {EnchantEffectApplicationData[]}
   */
  get availableEnchantments() {
    const keyPath = (this.item.type === "spell") && (this.item.system.level > 0) ? "item.level"
      : this.enchant.identifier ? `classes.${this.enchant.identifier}.levels` : "details.level";
    const level = foundry.utils.getProperty(this.getRollData(), keyPath) ?? 0;
    return this.effects
      .filter(e => e.effect && ((e.level.min ?? -Infinity) <= level) && (level <= (e.level.max ?? Infinity)));
  }

  /* -------------------------------------------- */

  /**
   * List of item types that are enchantable.
   * @type {Set<string>}
   */
  static get enchantableTypes() {
    return Object.entries(CONFIG.Item.dataModels).reduce((set, [k, v]) => {
      if ( v.metadata?.enchantable ) set.add(k);
      return set;
    }, new Set());
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @override */
  static transformEffectsData(source, options) {
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
