/**
 * Configuration for a specific trait choice.
 *
 * @typedef {object} TraitChoice
 * @property {number} count     Number of traits that can be selected.
 * @property {string[]} [pool]  List of trait or category keys that can be chosen. If no choices are provided,
 *                              any trait of the specified type can be selected.
 */

/**
 * Configuration data for the TraitAdvancement.
 *
 * @property {string} hint                Hint displayed instead of the automatically generated one.
 * @property {string} mode                Method by which this advancement modifies the actor's traits.
 * @property {boolean} allowReplacements  Whether all potential choices should be presented to the user if there
 *                                        are no more choices available in a more limited set.
 * @property {string[]} grants            Keys for traits granted automatically.
 * @property {TraitChoice[]} choices      Choices presented to the user.
 */
export class TraitConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      hint: new foundry.data.fields.StringField({label: "DND5E.AdvancementHint"}),
      mode: new foundry.data.fields.StringField({initial: "default", label: "DND5E.AdvancementTraitMode"}),
      allowReplacements: new foundry.data.fields.BooleanField({
        required: true, label: "DND5E.AdvancementTraitAllowReplacements",
        hint: "DND5E.AdvancementTraitAllowReplacementsHint"
      }),
      grants: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        required: true, label: "DND5E.AdvancementTraitGrants"
      }),
      choices: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
        count: new foundry.data.fields.NumberField({
          required: true, positive: true, integer: true, initial: 1, label: "DND5E.AdvancementTraitCount"
        }),
        pool: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
          required: false, label: "DOCUMENT.Items"
        })
      }), {label: "DND5E.AdvancementTraitChoices"})
    };
  }
}

/**
 * Value data for the TraitAdvancement.
 *
 * @property {Set<string>} chosen  Trait keys that have been chosen.
 */
export class TraitValueData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      chosen: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), { required: false })
    };
  }
}
