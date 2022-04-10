import * as creature from "./creature.mjs";

/**
 * Data definition for Player Characters.
 *
 * @property {AttributesData} attributes         Extended attributes with death saves, exhaustion, and inspiration.
 * @property {DetailsData} details               Extended details with additional character biography.
 * @property {object} resources                  Actor's three resources.
 * @property {ResourceData} resources.primary    Resource number one.
 * @property {ResourceData} resources.secondary  Resource number two.
 * @property {ResourceData} resources.tertiary   Resource number three.
 * @property {TraitsData} traits                 Extended traits with character's proficiencies.
 */
export default class ActorCharacterData extends creature.CreatureData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      attributes: new foundry.data.fields.EmbeddedDataField(AttributeData, {label: "DND5E.Attributes"}),
      details: new foundry.data.fields.EmbeddedDataField(DetailsData, {label: "DND5E.Details"}),
      resources: new foundry.data.fields.SchemaField({
        primary: new foundry.data.fields.EmbeddedDataField(ResourceData, {label: "DND5E.ResourcePrimary"}),
        secondary: new foundry.data.fields.EmbeddedDataField(ResourceData, {label: "DND5E.ResourceSecondary"}),
        tertiary: new foundry.data.fields.EmbeddedDataField(ResourceData, {label: "DND5E.ResourceTertiary"})
      }, {label: "DND5E.Resources"}),
      traits: new foundry.data.fields.EmbeddedDataField(TraitsData, {label: "DND5E.Traits"})
    };
  }
}

/**
 * An embedded data structure for extra attribute data used by characters.
 * @see ActorCharacterData
 *
 * @property {DeathData} death       Information on death saving throws.
 * @property {number} death.success  Number of successful death saves.
 * @property {number} death.failure  Number of failed death saves.
 * @property {number} exhaustion   Number of levels of exhaustion.
 * @property {number} inspiration  Does this character have inspiration?
 */
export class AttributeData extends creature.AttributeData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.hp.fields.value.initial = 0;
    schema.hp.fields.max.initial = 0;
    return {
      ...schema,
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
    };
  }
}

/**
 * An embedded data structure for extra details data used by characters.
 * @see ActorCharacterData
 *
 * @property {string} background     Name of character's background.
 * @property {string} originalClass  ID of first class taken by character.
 * @property {XPData} xp             Experience points gained.
 * @property {number} xp.value       Total experience points earned.
 * @property {number} xp.min         Minimum experience points for current level.
 * @property {number} xp.max         Maximum experience points for current level.
 * @property {string} appearance     Description of character's appearance.
 * @property {string} trait          Character's personality traits.
 * @property {string} ideal          Character's ideals.
 * @property {string} bond           Character's bonds.
 * @property {string} flaw           Character's flaws.
 */
export class DetailsData extends creature.DetailsData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
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
    };
  }
}

/**
 * An embedded data structure for individual resource properties.
 * @see DetailsData
 *
 * @property {number} value  Available uses of this resource.
 * @property {number} max    Maximum allowed uses of this resource.
 * @property {boolean} sr    Does this resource recover on a short rest?
 * @property {boolean} lr    Does this resource recover on a long rest?
 * @property {string} label  Displayed name.
 */
export class ResourceData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({
        required: true, integer: true, initial: 0, labels: "DND5E.ResourceValue"
      }),
      max: new foundry.data.fields.NumberField({
        required: true, integer: true, initial: 0, labels: "DND5E.ResourceMax"
      }),
      sr: new foundry.data.fields.BooleanField({required: true, labels: "DND5E.ShortRestRecovery"}),
      lr: new foundry.data.fields.BooleanField({required: true, labels: "DND5E.LongRestRecovery"}),
      label: new foundry.data.fields.StringField({required: true, labels: "DND5E.ResourceLabel"})
    };
  }
}

/**
 * An embedded data structure for extra trait data used by characters.
 * @see ActorCharacterData
 *
 * @property {object} weaponProf             Character's weapon proficiencies.
 * @property {Set<string>} weaponProf.value  Currently selected weapon proficiencies.
 * @property {string} weaponProf.custom      Semicolon-separated list of custom weapon proficiencies.
 * @property {object} armorProf              Character's armor proficiencies.
 * @property {Set<string>} armorProf.value   Currently selected armor proficiencies.
 * @property {string} armorProf.custom       Semicolon-separated list of custom armor proficiencies.
 * @property {object} toolProf               Character's tool proficiencies.
 * @property {Set<string>} toolProf.value    Currently selected tool proficiencies.
 * @property {string} toolProf.custom        Semicolon-separated list of custom tool proficiencies.
 */
export class TraitsData extends creature.TraitsData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      weaponProf: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(new foundry.data.fields.StringField({blank: false}), {
          label: "DND5E.TraitsChosen"
        }),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.TraitWeaponProf"}),
      armorProf: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(new foundry.data.fields.StringField({blank: false}), {
          label: "DND5E.TraitsChosen"
        }),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.TraitArmorProf"}),
      toolProf: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.SetField(new foundry.data.fields.StringField({blank: false}), {
          label: "DND5E.TraitsChosen"
        }),
        custom: new foundry.data.fields.StringField({required: true, label: "DND5E.Special"})
      }, {label: "DND5E.TraitToolProf"})
    };
  }
}
