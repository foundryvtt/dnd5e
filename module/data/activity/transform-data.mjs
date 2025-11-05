import FormulaField from "../fields/formula-field.mjs";
import TransformationSetting from "../settings/transformation-setting.mjs";
import BaseActivityData from "./base-activity.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, EmbeddedDataField,
  NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { TransformActivityData, TransformProfile } from "./_types.mjs";
 */

/**
 * Data model for a transform activity.
 * @extends {BaseActivityData<TransformActivityData>}
 * @mixes TransformActivityData
 */
export default class BaseTransformActivityData extends BaseActivityData {
  /** @inheritDoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      profiles: new ArrayField(new SchemaField({
        _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
        cr: new FormulaField({ deterministic: true }),
        level: new SchemaField({
          min: new NumberField({ integer: true, min: 0 }),
          max: new NumberField({ integer: true, min: 0 })
        }),
        movement: new SetField(new StringField()),
        name: new StringField(),
        sizes: new SetField(new StringField()),
        types: new SetField(new StringField()),
        uuid: new DocumentUUIDField({ type: "Actor" })
      })),
      settings: new EmbeddedDataField(TransformationSetting, { nullable: true, initial: null }),
      transform: new SchemaField({
        customize: new BooleanField(),
        mode: new StringField({ initial: "cr" }),
        preset: new StringField()
      })
    };
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get applicableEffects() {
    return null;
  }

  /* -------------------------------------------- */

  /**
   * Transform profiles that can be performed based on spell/character/class level.
   * @type {TransformProfile[]}
   */
  get availableProfiles() {
    const level = this.relevantLevel;
    return this.profiles.filter(e => ((e.level.min ?? -Infinity) <= level) && (level <= (e.level.max ?? Infinity)));
  }

  /* -------------------------------------------- */
  /*  Data Migrations                             */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static migrateData(source) {
    super.migrateData(source);
    if ( source.transform?.identifier ) {
      foundry.utils.setProperty(source, "visibility.identifier", source.transform.identifier);
      delete source.transform.identifier;
    }
    return source;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareFinalData(rollData) {
    super.prepareFinalData(rollData);
    if ( this.transform.customize && !this.settings ) {
      this.settings = new TransformationSetting({ preset: this.transform.preset });
    }
    else if ( !this.transform.customize ) this.settings = new TransformationSetting({
      ...(CONFIG.DND5E.transformation.presets[this.transform.preset]?.settings ?? {}),
      preset: this.transform.preset
    });
  }
}
