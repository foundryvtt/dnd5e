/**
 * Shared contents of the details schema between various actor types.
 */
export default class DetailsField {
  /**
   * Fields shared between characters, NPCs, and vehicles.
   *
   * @type {object}
   * @property {object} biography         Actor's biography data.
   * @property {string} biography.value   Full HTML biography information.
   * @property {string} biography.public  Biography that will be displayed to players with observer privileges.
   */
  static get common() {
    return {
      biography: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "DND5E.Biography"}),
        public: new foundry.data.fields.HTMLField({label: "DND5E.BiographyPublic"})
      }, {label: "DND5E.Biography"})
    };
  }

  /* -------------------------------------------- */

  /**
   * Fields shared between characters and NPCs.
   *
   * @type {object}
   * @property {string} alignment  Creature's alignment.
   * @property {string} ancestry   Creature's ancestry.
   * @property {string} culture    Creature's culture.
   */
  static get creature() {
    return {
      ancestry: new foundry.data.fields.StringField({required: true, label: "DND5E.Ancestry"}),
      alignment: new foundry.data.fields.StringField({required: true, label: "DND5E.Alignment"}),
      culture: new foundry.data.fields.StringField({required: true, label: "DND5E.Culture"})
    };
  }
}
