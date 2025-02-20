const { ForeignDocumentField } = foundry.data.fields;

/**
 * Data model for tracking information on the primary party.
 *
 * @property {Actor5e} actor  Group actor representing the primary party.
 */
export default class PrimaryPartySetting extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      actor: new ForeignDocumentField(foundry.documents.BaseActor)
    };
  }
}
