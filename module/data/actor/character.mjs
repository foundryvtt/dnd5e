import { FormulaField, LocalDocumentField } from "../fields.mjs";
import CreatureTypeField from "../shared/creature-type-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";

const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;

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
        ac: new SchemaField({
          flat: new NumberField({integer: true, min: 0, label: "DND5E.ArmorClassFlat"}),
          calc: new StringField({initial: "default", label: "DND5E.ArmorClassCalculation"}),
          formula: new FormulaField({deterministic: true, label: "DND5E.ArmorClassFormula"})
        }, {label: "DND5E.ArmorClass"}),
        hp: new SchemaField({
          value: new NumberField({
            nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.HitPointsCurrent"
          }),
          max: new NumberField({
            nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsOverride"
          }),
          temp: new NumberField({integer: true, initial: 0, min: 0, label: "DND5E.HitPointsTemp"}),
          tempmax: new NumberField({integer: true, initial: 0, label: "DND5E.HitPointsTempMax"}),
          bonuses: new SchemaField({
            level: new FormulaField({deterministic: true, label: "DND5E.HitPointsBonusLevel"}),
            overall: new FormulaField({deterministic: true, label: "DND5E.HitPointsBonusOverall"})
          })
        }, {label: "DND5E.HitPoints"}),
        death: new SchemaField({
          success: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveSuccesses"
          }),
          failure: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveFailures"
          })
        }, {label: "DND5E.DeathSave"}),
        inspiration: new BooleanField({required: true, label: "DND5E.Inspiration"})
      }, {label: "DND5E.Attributes"}),
      details: new SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        background: new LocalDocumentField(foundry.documents.BaseItem, {
          required: true, fallback: true, label: "DND5E.Background"
        }),
        originalClass: new StringField({required: true, label: "DND5E.ClassOriginal"}),
        xp: new SchemaField({
          value: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.ExperiencePointsCurrent"
          })
        }, {label: "DND5E.ExperiencePoints"}),
        appearance: new StringField({required: true, label: "DND5E.Appearance"}),
        trait: new StringField({required: true, label: "DND5E.PersonalityTraits"}),
        ideal: new StringField({required: true, label: "DND5E.Ideals"}),
        bond: new StringField({required: true, label: "DND5E.Bonds"}),
        flaw: new StringField({required: true, label: "DND5E.Flaws"}),
        gender: new StringField({ label: "DND5E.Gender" }),
        eyes: new StringField({ label: "DND5E.Eyes" }),
        height: new StringField({ label: "DND5E.Height" }),
        faith: new StringField({ label: "DND5E.Faith" }),
        hair: new StringField({ label: "DND5E.Hair" }),
        skin: new StringField({ label: "DND5E.Skin" }),
        age: new StringField({ label: "DND5E.Age" }),
        weight: new StringField({ label: "DND5E.Weight" })
      }, {label: "DND5E.Details"}),
      traits: new SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature,
        weaponProf: TraitsFields.makeSimpleTrait({label: "DND5E.TraitWeaponProf"}),
        armorProf: TraitsFields.makeSimpleTrait({label: "DND5E.TraitArmorProf"})
      }, {label: "DND5E.Traits"}),
      resources: new SchemaField({
        primary: makeResourceField({label: "DND5E.ResourcePrimary"}),
        secondary: makeResourceField({label: "DND5E.ResourceSecondary"}),
        tertiary: makeResourceField({label: "DND5E.ResourceTertiary"})
      }, {label: "DND5E.Resources"})
    });
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritdoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateInitiative(source.attributes);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare movement & senses values derived from race item.
   */
  prepareEmbeddedData() {
    const raceData = this.details.race?.system;
    if ( !raceData ) {
      this.details.type = new CreatureTypeField({ swarm: false }).initialize({ value: "humanoid" }, this);
      return;
    }

    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) {
      if ( raceData.movement[key] ) this.attributes.movement[key] ??= raceData.movement[key];
    }
    if ( raceData.movement.hover ) this.attributes.movement.hover = true;
    this.attributes.movement.units ??= raceData.movement.units;

    for ( const key of Object.keys(CONFIG.DND5E.senses) ) {
      if ( raceData.senses[key] ) this.attributes.senses[key] ??= raceData.senses[key];
    }
    this.attributes.senses.special = [this.attributes.senses.special, raceData.senses.special].filterJoin(";");
    this.attributes.senses.units ??= raceData.senses.units;

    this.details.type = raceData.type;
  }

  /* -------------------------------------------- */

  /**
   * Prepare remaining character data.
   */
  prepareDerivedData() {
    AttributesFields.prepareExhaustionLevel.call(this);
    AttributesFields.prepareMovement.call(this);
    TraitsFields.prepareResistImmune.call(this);
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
  return new SchemaField({
    value: new NumberField({required: true, integer: true, initial: 0, labels: "DND5E.ResourceValue"}),
    max: new NumberField({required: true, integer: true, initial: 0, labels: "DND5E.ResourceMax"}),
    sr: new BooleanField({required: true, labels: "DND5E.ShortRestRecovery"}),
    lr: new BooleanField({required: true, labels: "DND5E.LongRestRecovery"}),
    label: new StringField({required: true, labels: "DND5E.ResourceLabel"})
  }, schemaOptions);
}
