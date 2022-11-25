
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
      attributes: new fields.SchemaField({
        movement: new fields.SchemaField({
          land: new fields.NumberField({min: 0, initial: 0, nullable: false}),
          water: new fields.NumberField({min: 0, initial: 0, nullable: false}),
          air: new fields.NumberField({min: 0, initial: 0, nullable: false})
        })
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
      if ( a ) {
        if ( a.type === "group" ) console.warn(`Group "${this._id}" may not contain another Group "${a.id}" as a member.`)
        else this.members.add(a);
      }
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

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  async addMember(actor) {
    if ( actor.type === "group" ) throw new Error(`You may not add a group within a group.`);
    if ( actor.pack ) throw new Error(`You may only add Actors to the group which exist within the World.`);
    const memberIds = this._source.members;
    if ( memberIds.includes(actor.id) ) return;
    return this.parent.update({
      system: {
        members: memberIds.concat([actor.id])
      }
    });
  }

  /* -------------------------------------------- */

  async removeMember(actor) {
    const memberIds = Array.from(this._source.members);
    const actorId = actor instanceof Actor ? actor.id : actor;
    if ( !memberIds.includes(actorId) ) return;
    memberIds.findSplice(id => id === actorId);
    return this.parent.update({
      system: {
        members: memberIds
      }
    });
  }
}
