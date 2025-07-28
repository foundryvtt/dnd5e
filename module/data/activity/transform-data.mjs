import FormulaField from "../fields/formula-field.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
import TransformationSetting from "../settings/transformation-setting.mjs";
import BaseActivityData from "./base-activity.mjs";

const {
  ArrayField, BooleanField, DocumentIdField, DocumentUUIDField, EmbeddedDataField,
  NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { TransformationSettingData } from "../settings/transformation-setting.mjs";
 */

/**
 * @typedef TransformProfile
 * @property {string} _id            Unique ID for this profile.
 * @property {string} cr             Formula for the CR of creature to transform into if in CR mode.
 * @property {object} level
 * @property {number} level.min      Minimum level at which this profile can be used.
 * @property {number} level.max      Maximum level at which this profile can be used.
 * @property {Set<string>} movement  Movement types that aren't allowed on selected creatures.
 * @property {string} name           Display name for this profile.
 * @property {Set<string>} sizes     Allowed creature sizes, or blank to allow all sizes.
 * @property {Set<string>} types     Allowed creature types, or blank to allow all types.
 * @property {string} uuid           UUID of the actor to transform into if in direct mode.
 */

/**
 * Data model for a transform activity.
 *
 * @property {TransformProfile[]} profiles     Information on transformation methods and sources.
 * @property {TransformationSetting} settings  Settings data to use when summoning.
 * @property {object} transform
 * @property {boolean} transform.customize     Should any customized settings be respected or should the default
 *                                             settings for the selected profile be used instead.
 * @property {string} transform.identifier     Class identifier that will be used to determine applicable level.
 * @property {""|"cr"} transform.mode          Method of determining what type of creature to transform into.
 * @property {string} transform.preset         Transformation preset to use.
 */
export default class TransformActivityData extends BaseActivityData {
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
        identifier: new IdentifierField(),
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

  /**
   * Determine the level used to determine profile limits, based on the spell level for spells or either the
   * character or class level, depending on whether `classIdentifier` is set.
   * @type {number}
   */
  get relevantLevel() {
    const keyPath = (this.item.type === "spell") && (this.item.system.level > 0) ? "item.level"
      : this.transform.identifier ? `classes.${this.transform.identifier}.levels` : "details.level";
    return foundry.utils.getProperty(this.getRollData(), keyPath) ?? 0;
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
