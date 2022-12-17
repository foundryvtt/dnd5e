import SystemDataModel from "../../abstract.mjs";

/**
 *
 */
export default class DetailsField extends foundry.data.fields.SchemaField {
  constructor(extraSchema, options) {
    const extraFields = SystemDataModel.mergeSchema(
      options.type !== "vehicle" ? DetailsField.creatureFields() : {},
      extraSchema
    );
    super(SystemDataModel.mergeSchema({
      biography: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "DND5E.Biography"}),
        public: new foundry.data.fields.HTMLField({label: "DND5E.BiographyPublic"})
      }, {label: "DND5E.Biography"})
    }, extraFields), options);
  }

  /* -------------------------------------------- */

  static creatureFields() {
    return {
      alignment: new foundry.data.fields.StringField({required: true, label: "DND5E.Alignment"}),
      race: new foundry.data.fields.StringField({required: true, label: "DND5E.Race"})
    };
  }
}
