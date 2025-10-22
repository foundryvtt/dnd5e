import SparseDataModel from "../abstract/sparse-data-model.mjs";
import MappingField from "../fields/mapping-field.mjs";

const { DocumentUUIDField, NumberField, SetField, StringField } = foundry.data.fields;

/**
 * @import { AbilityScoreImprovementConfigurationData, AbilityScoreImprovementValueData } from "./_types.mjs";
 */

/**
 * Data model for the Ability Score Improvement advancement configuration.
 * @extends DataModel<AbilityScoreImprovementConfigurationData>
 * @mixes AbilityScoreImprovementConfigurationData
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
 * @extends SparseDataModel<AbilityScoreImprovementValueData>
 * @mixes AbilityScoreImprovementValueData
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
