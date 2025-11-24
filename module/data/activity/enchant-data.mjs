import BaseActivityData from "./base-activity.mjs";
import AppliedEffectField from "./fields/applied-effect-field.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { EnchantActivityData, EnchantEffectApplicationData } from "./_types.mjs";
 */

/**
 * Data model for a enchant activity.
 * @extends {BaseActivityData<EnchantActivityData>}
 * @mixes EnchantActivityData
 */
export default class BaseEnchantActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      effects: new ArrayField(new AppliedEffectField({
        riders: new SchemaField({
          activity: new SetField(new DocumentIdField()),
          effect: new SetField(new DocumentIdField()),
          item: new SetField(new DocumentUUIDField({ type: "Item" }))
        })
      })),
      enchant: new SchemaField({
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
    const level = this.relevantLevel;
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
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( source.enchant?.identifier ) {
      foundry.utils.setProperty(source, "visibility.identifier", source.enchant.identifier);
      delete source.enchant.identifier;
    }
    return source;
  }

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
      restrictions: source.system.enchantment?.restrictions ?? [],
      visibility: {
        identifier: source.system.enchantment?.classIdentifier ?? ""
      }
    });
  }
}
