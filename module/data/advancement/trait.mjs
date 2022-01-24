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
 * @property {string} type                Trait type as defined in `CONFIG.traits`.
 * @property {boolean} allowReplacements  Whether all potential choices should be presented to the user if there
 *                                        are no more choices available in a more limited set.
 * @property {string[]} grants            Keys for traits granted automatically.
 * @property {TraitChoice[]} choices      Choices presented to the user.
 */
export class TraitConfigurationData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({
        required: true, blank: false, initial: () => Object.keys(CONFIG.DND5E.traits)[0],
        label: "DND5E.AdvancementTraitType"
      }),
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
          required: false, initial: undefined, label: "DOCUMENT.Items"
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
      chosen: new foundry.data.fields.SetField(new foundry.data.fields.StringField(), {
        required: false, initial: undefined
      })
    };
  }
}
