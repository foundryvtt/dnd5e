import { makeSimpleTrait } from "../fields.mjs";
import CreatureTemplate from "./templates/creature.mjs";

/**
 * System data definition for Characters.
 *
 * @property {object} attributes
 * @property {object} attributes.death          Information on death saving throws.
 * @property {number} attributes.death.success  Number of successful death saves.
 * @property {number} attributes.death.failure  Number of failed death saves.
 * @property {number} attributes.exhaustion     Number of levels of exhaustion.
 * @property {number} attributes.inspiration    Does this character have inspiration?
 * @property {object} details
 * @property {string} details.background        Name of character's background.
 * @property {string} details.originalClass     ID of first class taken by character.
 * @property {XPData} details.xp                Experience points gained.
 * @property {number} details.xp.value          Total experience points earned.
 * @property {number} details.xp.min            Minimum experience points for current level.
 * @property {number} details.xp.max            Maximum experience points for current level.
 * @property {string} details.appearance        Description of character's appearance.
 * @property {string} details.trait             Character's personality traits.
 * @property {string} details.ideal             Character's ideals.
 * @property {string} details.bond              Character's bonds.
 * @property {string} details.flaw              Character's flaws.
 * @property {object} traits
 * @property {object} traits.weaponProf         Character's weapon proficiencies.
 * @property {object} traits.armorProf          Character's armor proficiencies.
 * @property {object} traits.toolProf           Character's tool proficiencies.
 * @property {object} resources
 * @property {CharacterResourceData}            resources.primary    Resource number one.
 * @property {CharacterResourceData}            resources.secondary  Resource number two.
 * @property {CharacterResourceData}            resources.tertiary   Resource number three.
 */
export default class CharacterData extends CreatureTemplate {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new foundry.data.fields.SchemaField({
        hp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({initial: 0}),
          max: new foundry.data.fields.NumberField({initial: 0})
        }),
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
      }),
      details: new foundry.data.fields.SchemaField({
        background: new foundry.data.fields.StringField({required: true, label: "DND5E.Background"}),
        originalClass: new foundry.data.fields.StringField({required: true, label: "DND5E.ClassOriginal"}),
        xp: new foundry.data.fields.SchemaField({
          value: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.ExperiencePointsCurrent"
          }),
          min: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.ExperiencePointsMin"
          }),
          max: new foundry.data.fields.NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 300, label: "DND5E.ExperiencePointsMax"
          })
        }, {
          label: "DND5E.ExperiencePoints", validate: d => d.min <= d.max,
          validationError: "XP minimum must be less than XP maximum"
        }),
        appearance: new foundry.data.fields.StringField({required: true, label: "DND5E.Appearance"}),
        trait: new foundry.data.fields.StringField({required: true, label: "DND5E.PersonalityTraits"}),
        ideal: new foundry.data.fields.StringField({required: true, label: "DND5E.Ideals"}),
        bond: new foundry.data.fields.StringField({required: true, label: "DND5E.Bonds"}),
        flaw: new foundry.data.fields.StringField({required: true, label: "DND5E.Flaws"})
      }),
      traits: new foundry.data.fields.SchemaField({
        weaponProf: makeSimpleTrait({label: "DND5E.TraitWeaponProf"}),
        armorProf: makeSimpleTrait({label: "DND5E.TraitArmorProf"}),
        toolProf: makeSimpleTrait({label: "DND5E.TraitToolProf"})
      }),
      resources: new foundry.data.fields.SchemaField({
        primary: makeResourceField({label: "DND5E.ResourcePrimary"}),
        secondary: makeResourceField({label: "DND5E.ResourceSecondary"}),
        tertiary: makeResourceField({label: "DND5E.ResourceTertiary"})
      }, {label: "DND5E.Resources"})
    });
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
