const { ForeignDocumentField } = foundry.data.fields;

/**
 * @import { PrimaryPartySettingData } from "./_types.mjs";
 */

/**
 * Data model for tracking information on the primary party.
 * @extends {foundry.abstract.DataModel<PrimaryPartySettingData>}
 * @mixes PrimaryPartySettingData
 */
export default class PrimaryPartySetting extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      actor: new ForeignDocumentField(foundry.documents.BaseActor)
    };
  }
}
