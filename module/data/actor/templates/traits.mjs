import SystemDataModel from "../../abstract.mjs";
import { makeSimpleTrait } from "../../fields.mjs";

/**
 *
 */
export default class TraitsField extends foundry.data.fields.SchemaField {
  constructor(extraSchema, options) {
    const extraFields = SystemDataModel.mergeSchema(
      options.type !== "vehicle" ? TraitsField.creatureFields() : {},
      extraSchema
    );
    super(SystemDataModel.mergeSchema({
      size: new foundry.data.fields.StringField({
        required: true, initial: options.type === "vehicle" ? "lg" : "med", label: "DND5E.Size"
      }),
      di: makeSimpleTrait({label: "DND5E.DamImm"}, options.type === "vehicle" ? ["poison", "psychic"] : []), // TODO: Add "bypasses" here
      dr: makeSimpleTrait({label: "DND5E.DamRes"}), // TODO: Add "bypasses" here
      dv: makeSimpleTrait({label: "DND5E.DamVuln"}), // TODO: Add "bypasses" here
      ci: makeSimpleTrait({label: "DND5E.ConImm"}, options.type === "vehicle" ? [
        "blinded", "charmed", "deafened", "frightened", "paralyzed",
        "petrified", "poisoned", "stunned", "unconscious"
      ] : [])
    }, extraFields), options);
  }

  /* -------------------------------------------- */

  static creatureFields() {
    return {
      languages: makeSimpleTrait({label: "DND5E.Languages"})
    };
  }
}
