import { FormulaField, LocalDocumentField } from "../fields.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

/**
 * System data definition for Characters.
 *
 * @property {object} attributes
 * @property {object} attributes.ac
 * @property {number} attributes.ac.flat                  Flat value used for flat or natural armor calculation.
 * @property {string} attributes.ac.calc                  Name of one of the built-in formulas to use.
 * @property {string} attributes.ac.formula               Custom formula to use.
 * @property {object} attributes.hp
 * @property {number} attributes.hp.value                 Current hit points.
 * @property {number} attributes.hp.max                   Override for maximum HP.
 * @property {number} attributes.hp.temp                  Temporary HP applied on top of value.
 * @property {number} attributes.hp.tempmax               Temporary change to the maximum HP.
 * @property {object} attributes.hp.bonuses
 * @property {string} attributes.hp.bonuses.level         Bonus formula applied for each class level.
 * @property {string} attributes.hp.bonuses.overall       Bonus formula applied to total HP.
 * @property {object} attributes.death
 * @property {number} attributes.death.success            Number of successful death saves.
 * @property {number} attributes.death.failure            Number of failed death saves.
 * @property {number} attributes.exhaustion               Number of levels of exhaustion.
 * @property {number} attributes.inspiration              Does this character have inspiration?
 * @property {object} details
 * @property {Item5e|string} details.background           Character's background item or name.
 * @property {string} details.originalClass               ID of first class taken by character.
 * @property {XPData} details.xp                          Experience points gained.
 * @property {number} details.xp.value                    Total experience points earned.
 * @property {string} details.appearance                  Description of character's appearance.
 * @property {string} details.trait                       Character's personality traits.
 * @property {string} details.ideal                       Character's ideals.
 * @property {string} details.bond                        Character's bonds.
 * @property {string} details.flaw                        Character's flaws.
 * @property {object} traits
 * @property {SimpleTraitData} traits.weaponProf          Character's weapon proficiencies.
 * @property {SimpleTraitData} traits.armorProf           Character's armor proficiencies.
 * @property {object} resources
 * @property {CharacterResourceData} resources.primary    Resource number one.
 * @property {CharacterResourceData} resources.secondary  Resource number two.
 * @property {CharacterResourceData} resources.tertiary   Resource number three.
 */
export default class CharacterData extends CreatureTemplate {

  /** @inheritdoc */
  static _systemType = "character";

  /* -------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new foundry.data.fields.SchemaField({
        ...AttributesFields.common,
        ...AttributesFields.creature,
        ac: new foundry.data.fields.SchemaField({
          flat: new foundry.data.fields.NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
          calc: new foundry.data.fields.StringField({initial: "default", label: "DND5E.ArmorClassCalculation"}),
          formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
        }, {label: "DND5E.ArmorClass"}),
        hp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.HitPointsCurrent"
          }),
          max: new foundry.data.fields.NumberField({
            nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsOverride"
          }),
          temp: new foundry.data.fields.NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
          tempmax: new foundry.data.fields.NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"}),
          bonuses: new foundry.data.fields.SchemaField({
            level: new FormulaField({deterministic: true, label: "DND5E.HitPointsBonusLevel"}),
            overall: new FormulaField({deterministic: true, label: "DND5E.HitPointsBonusOverall"})
          })
        }, {label: "DND5E.HitPoints"}),
        death: new foundry.data.fields.SchemaField({
          success: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveSuccesses"
          }),
          failure: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveFailures"
          })
        }, {label: "DND5E.DeathSave"}),
        exhaustion: new foundry.data.fields.NumberField({
          required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.Exhaustion"
        }),
        inspiration: new foundry.data.fields.BooleanField({required: true, label: "DND5E.Inspiration"})
      }, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        background: new LocalDocumentField(foundry.documents.BaseItem, {
          required: true, fallback: true, label: "DND5E.Background"
        }),
        originalClass: new foundry.data.fields.StringField({required: true, label: "DND5E.ClassOriginal"}),
        xp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.ExperiencePointsCurrent"
          })
        }, {label: "DND5E.ExperiencePoints"}),
        appearance: new foundry.data.fields.StringField({required: true, label: "DND5E.Appearance"}),
        trait: new foundry.data.fields.StringField({required: true, label: "DND5E.PersonalityTraits"}),
        ideal: new foundry.data.fields.StringField({required: true, label: "DND5E.Ideals"}),
        bond: new foundry.data.fields.StringField({required: true, label: "DND5E.Bonds"}),
        flaw: new foundry.data.fields.StringField({required: true, label: "DND5E.Flaws"})
      }, {label: "DND5E.Details"}),
      traits: new foundry.data.fields.SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature,
        weaponProf: TraitsFields.makeSimpleTrait({label: "DND5E.TraitWeaponProf"}),
        armorProf: TraitsFields.makeSimpleTrait({label: "DND5E.TraitArmorProf"})
      }, {label: "DND5E.Traits"}),
      resources: new foundry.data.fields.SchemaField({
        primary: makeResourceField({label: "DND5E.ResourcePrimary"}),
        secondary: makeResourceField({label: "DND5E.ResourceSecondary"}),
        tertiary: makeResourceField({label: "DND5E.ResourceTertiary"})
      }, {label: "DND5E.Resources"})
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateInitiative(source.attributes);
  }

  /* -------------------------------------------- */

  prepareDerivedData() {
    // Populate the background field with background if background item exists but is not set
    if ( !(this.details.background instanceof dnd5e.documents.Item5e) ) {
      const background = this.parent.itemTypes.background?.[0];
      if ( background ) Object.defineProperty(this.details, "background", {
        get() { return background; },
        enumerable: false
      });
    }
  }
}

/* -------------------------------------------- */

/**
 * Data structure for character's resources.
 *
 * @typedef {object} ResourceData
 * @property {number} value  Available uses of this resource.
 * @property {number} max    Maximum allowed uses of this resource.
 * @property {boolean} sr    Does this resource recover on a short rest?
 * @property {boolean} lr    Does this resource recover on a long rest?
 * @property {string} label  Displayed name.
 */

/**
 * Produce the schema field for a simple trait.
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
function makeResourceField(schemaOptions={}) {
  return new foundry.data.fields.SchemaField({
    value: new foundry.data.fields.NumberField({
      required: true, integer: true, initial: 0, labels: "DND5E.ResourceValue"
    }),
    max: new foundry.data.fields.NumberField({
      required: true, integer: true, initial: 0, labels: "DND5E.ResourceMax"
    }),
    sr: new foundry.data.fields.BooleanField({required: true, labels: "DND5E.ShortRestRecovery"}),
    lr: new foundry.data.fields.BooleanField({required: true, labels: "DND5E.LongRestRecovery"}),
    label: new foundry.data.fields.StringField({required: true, labels: "DND5E.ResourceLabel"})
  }, schemaOptions);
}
