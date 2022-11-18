
/**
 * A data model and API layer which handles the schema and functionality of "group" type Actors in the dnd5e system.
 *
 * @example Create a new Group
 * const g = new dnd5e.documents.Actor5e({
 *  type: "group",
 *  name: "Test Group",
 *  system: {
 *    members: ["3f3hoYFWUgDqBP4U"]
 *  }
 * });
 */
export default class GroupActor extends foundry.abstract.DataModel {

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.SchemaField({
        full: new fields.StringField(),
        summary: new fields.StringField()
      }),
      members: new fields.SetField(new fields.ForeignDocumentField(foundry.documents.BaseActor, {idOnly: true})),
      movement: new fields.SchemaField({
        land: new fields.NumberField({min: 0, initial: 0, nullable: false}),
        water: new fields.NumberField({min: 0, initial: 0, nullable: false}),
        air: new fields.NumberField({min: 0, initial: 0, nullable: false}),
        units: new fields.StringField({blank: false, choices: () => CONFIG.DND5E.movementUnits, initial: "mi"})
      })
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare base data for group actors.
   * @internal
   */
  _prepareBaseData() {
    this.members.clear();
    for ( const id of this._source.members) {
      const a = game.actors.get(id);
      if ( a ) this.members.add(a);
      else console.warn(`Actor "${id}" in group "${this._id}" does not exist within the World.`);
    }
  }

  /**
   * Prepare derived data for group actors.
   * @internal
   */
  _prepareDerivedData() {
    // No preparation needed at this time
  }
}
