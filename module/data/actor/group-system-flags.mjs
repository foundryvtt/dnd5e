const { ForeignDocumentField, SetField } = foundry.data.fields;

/**
 * A custom model to validate system flags on Group Actors.
 *
 * @property {Set<string>} awardDestinations  Saved targets from previous use of award button.
 */
export default class GroupSystemFlags extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      awardDestinations: new SetField(
        new ForeignDocumentField(foundry.documents.BaseActor, { idOnly: true }), { required: false }
      )
    };
  }
}
