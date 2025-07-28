const { BooleanField, DocumentIdField, SchemaField, SetField } = foundry.data.fields;

/**
 * A custom model to validate system flags on Group Actors.
 *
 * @property {Set<string>} awardDestinations       Saved targets from previous use of award button.
 * @property {object} [restSettings]
 * @property {boolean} [restSettings.autoRest]     Saved Auto Rest setting from previous group rest.
 * @property {Set<string>} [restSettings.targets]  Saved targets form previous group rest.
 */
export default class GroupSystemFlags extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      awardDestinations: new SetField(new DocumentIdField(), { required: false }),
      restSettings: new SchemaField({
        autoRest: new BooleanField(),
        targets: new SetField(new DocumentIdField())
      }, { required: false, nullable: true, initial: null }),
      showTokenPortrait: new BooleanField()
    };
  }
}
