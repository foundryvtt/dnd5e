import FormulaField from "../fields/formula-field.mjs";
import BaseActivityData from "./base-activity.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { SummonActivityData, SummonsProfile } from "./_types.mjs";
 */

/**
 * Data model for a summon activity.
 * @extends {BaseActivityData<SummonActivityData>}
 * @mixes SummonActivityData
 */
export default class BaseSummonActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      bonuses: new SchemaField({
        ac: new FormulaField(),
        hd: new FormulaField(),
        hp: new FormulaField(),
        attackDamage: new FormulaField(),
        saveDamage: new FormulaField(),
        healing: new FormulaField()
      }),
      creatureSizes: new SetField(new StringField()),
      creatureTypes: new SetField(new StringField()),
      disposition: new NumberField({ nullable: true, choices: Object.values(CONST.TOKEN_DISPOSITIONS) }),
      match: new SchemaField({
        ability: new StringField(),
        attacks: new BooleanField(),
        proficiency: new BooleanField(),
        saves: new BooleanField()
      }),
      profiles: new ArrayField(new SchemaField({
        _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
        count: new FormulaField(),
        cr: new FormulaField({ deterministic: true }),
        level: new SchemaField({
          min: new NumberField({ integer: true, min: 0 }),
          max: new NumberField({ integer: true, min: 0 })
        }),
        name: new StringField(),
        types: new SetField(new StringField()),
        uuid: new DocumentUUIDField()
      })),
      summon: new SchemaField({
        mode: new StringField(),
        prompt: new BooleanField({ initial: true })
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @inheritDoc */
  get ability() {
    return this.match.ability || super.ability || this.item.abilityMod || this.actor?.system.attributes?.spellcasting;
  }

  /* -------------------------------------------- */

  /** @override */
  get actionType() {
    return "summ";
  }

  /* -------------------------------------------- */

  /**
   * Summons that can be performed based on spell/character/class level.
   * @type {SummonsProfile[]}
   */
  get availableProfiles() {
    const level = this.relevantLevel;
    return this.profiles.filter(e => ((e.level.min ?? -Infinity) <= level) && (level <= (e.level.max ?? Infinity)));
  }

  /* -------------------------------------------- */

  /**
   * Creatures summoned by this activity.
   * @type {Actor5e[]}
   */
  get summonedCreatures() {
    if ( !this.actor ) return [];
    return dnd5e.registry.summons.creatures(this.actor)
      .filter(i => i?.getFlag("dnd5e", "summon.origin") === this.uuid);
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( source.summon?.identifier ) {
      foundry.utils.setProperty(source, "visibility.identifier", source.summon.identifier);
      delete source.summon.identifier;
    }
    return source;
  }

  /* -------------------------------------------- */

  /** @override */
  static transformTypeData(source, activityData, options) {
    return foundry.utils.mergeObject(activityData, {
      bonuses: source.system.summons?.bonuses ?? {},
      creatureSizes: source.system.summons?.creatureSizes ?? [],
      creatureTypes: source.system.summons?.creatureTypes ?? [],
      match: {
        ...(source.system.summons?.match ?? {}),
        ability: source.system.ability
      },
      profiles: source.system.summons?.profiles ?? [],
      summon: {
        mode: source.system.summons?.mode ?? "",
        prompt: source.system.summons?.prompt ?? true
      },
      visibility: {
        identifier: source.system.summons?.classIdentifier ?? ""
      }
    });
  }
}
