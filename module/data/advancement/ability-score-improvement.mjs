import SparseDataModel from "../abstract/sparse-data-model.mjs";
import MappingField from "../fields/mapping-field.mjs";

const { DocumentUUIDField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * Data model for the Ability Score Improvement advancement configuration.
 *
 * @property {number} cap                    Maximum number of points that can be assigned to a single score.
 * @property {Object<string, number>} fixed  Number of points automatically assigned to a certain score.
 * @property {Set<string>} locked            Abilities that cannot be changed by this advancement.
 * @property {number} max                    Override for the maximum ability score.
 * @property {number} points                 Number of points that can be assigned to any score.
 * @property {string} recommendation         Epic Boon feat recommended by this class.
 */
export class AbilityScoreImprovementConfigurationData extends foundry.abstract.DataModel {

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.ADVANCEMENT.AbilityScoreImprovement"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return {
      cap: new NumberField({ integer: true, min: 1, initial: 2 }),
      fixed: new MappingField(new NumberField({ nullable: false, integer: true, initial: 0 })),
      locked: new SetField(new StringField()),
      max: new NumberField({ integer: true, min: 1 }),
      points: new NumberField({ integer: true, min: 0, initial: 0 }),
      recommendation: new DocumentUUIDField({ type: "Item" })
    };
  }
}

/**
 * Data model for the Ability Score Improvement advancement value.
 *
 * @property {string} type             When on a class, whether the player chose ASI or a Feat.
 * @property {Object<string, number>}  Points assigned to individual scores.
 * @property {Object<string, string>}  Feat that was selected.
 */
export class AbilityScoreImprovementValueData extends SparseDataModel {
  /** @inheritDoc */
  static defineSchema() {
    return {
      type: new StringField({ required: true, initial: "asi", choices: ["asi", "feat"] }),
      assignments: new MappingField(new NumberField({
        nullable: false, integer: true
      }), { required: false, initial: undefined }),
      feat: new MappingField(new StringField(), { required: false, initial: undefined, label: "DND5E.Feature.Feat" })
    };
  }
}
