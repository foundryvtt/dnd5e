import { DocumentData } from "/common/abstract/module.mjs";
import * as fields from "/common/data/fields.mjs";
import { FORMULA_FIELD } from "../../fields.js";
import { defaultData, mergeObjects } from "./base.js";
import * as common from "./common.js";


export class ItemSpellData extends DocumentData {
  static defineSchema() {
    return mergeObjects(
      common.ItemDescriptionData.defineSchema(),
      common.ActivatedEffectData.defineSchema(),
      common.ActionData.defineSchema(),
      {
        level: fields.field(fields.NONNEGATIVE_INTEGER_FIELD, {
          required: true,
          nullable: false,
          default: defaultData("spell.level")
        }),
        school: fields.BLANK_STRING,
        components: {
          type: ComponentsData,
          required: true,
          nullable: false,
          default: defaultData("spell.components")
        },
        materials: {
          type: MaterialsData,
          required: true,
          nullable: false,
          default: defaultData("spell.materials")
        },
        preparation: {
          type: PreparationData,
          required: true,
          nullable: false,
          default: defaultData("spell.preparation")
        },
        scaling: {
          type: ScalingData,
          required: true,
          nullable: false,
          default: defaultData("spell.scaling")
        }
      }
    );
  }
}

/**
 * An embedded data structure for spell components and tags.
 * @extends DocumentData
 * @see ItemSpellData
 *
 * @property {boolean} vocal          Does this spell require vocal components?
 * @property {boolean} somatic        Does this spell require somatic components?
 * @property {boolean} material       Does this spell require material components?
 * @property {boolean} ritual         Can this spell be cast as a ritual?
 * @property {boolean} concentration  Does this spell require concentration?
 */
class ComponentsData extends DocumentData {
  static defineSchema() {
    return {
      vocal: fields.BOOLEAN_FIELD,
      somantic: fields.BOOLEAN_FIELD,
      material: fields.BOOLEAN_FIELD,
      ritual: fields.BOOLEAN_FIELD,
      concentration: fields.BOOLEAN_FIELD
    };
  }
}

/**
 * An embedded data structure for a spell's material requirements.
 * @extends DocumentData
 * @see ItemSpellData
 *
 * @property {string} value      Description of the material components required for casting.
 * @property {boolean} consumed  Are these material components consumed during casting?
 * @property {number} cost       GP cost for the required components.
 * @property {number} supply     Quantity of this component available.
 */
class MaterialsData extends DocumentData {
  static defineSchema() {
    return {
      value: fields.BLANK_STRING,
      consumed: fields.BOOLEAN_FIELD,
      cost: fields.REQUIRED_NUMBER,
      supply: fields.REQUIRED_NUMBER
    };
  }
}

/**
 * An embedded data structure for spell preparation.
 * @extends DocumentData
 * @see ItemSpellData
 *
 * @property {string} mode       Spell preparation mode as defined in `DND5E.spellPreparationModes`.
 * @property {boolean} prepared  Is the spell currently prepared?
 */
class PreparationData extends DocumentData {
  static defineSchema() {
    return {
      mode: fields.field(fields.REQUIRED_STRING, { default: defaultData("spell.preparation.mode") }),
      prepared: fields.BOOLEAN_FIELD
    };
  }
}

/**
 * An embedded data structure for spell scaling when cast at a higher level.
 * @extends DocumentData
 * @see ItemSpellData
 *
 * @property {string} mode     Spell scaling mode as defined in `DND5E.spellScalingModes`.
 * @property {string} formula  Dice formula used for scaling.
 */
class ScalingData extends DocumentData {
  static defineSchema() {
    return {
      mode: fields.field(fields.REQUIRED_STRING, { default: defaultData("spell.scaling.mode") }),
      formula: fields.field(FORMULA_FIELD, { nullable: true, default: null })
    };
  }
}
