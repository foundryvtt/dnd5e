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

  /* -------------------------------------------- */

  /**
   * Adjust the number of this entry in the table of contents.
   * @param {number} number  Current position number.
   * @returns {{ number: string, adjustment: [number] }|void}
   */
  adjustTOCNumbering(number) {
    if ( !this.code ) return;
    return { number: this.code, adjustment: -1 };
  }
}
