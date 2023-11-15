/**
 * Data definition for Map Location journal entry pages.
 *
 * @property {string} code  Code for the location marker on the map.
 */
export default class MapLocationJournalPageData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      code: new foundry.data.fields.StringField()
    };
  }
}
