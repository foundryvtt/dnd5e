import * as fields from "/common/data/fields.mjs";


class GrantedTraitData extends foundry.abstract.DocumentData {
  static defineSchema() {
    return {
      choices: {
        type: [String],
        required: false,
        default: []
      },
      count: fields.field(fields.POSITIVE_INTEGER_FIELD, {
        required: true,
        nullable: false,
        default: 1
      })
    };
  }
}
