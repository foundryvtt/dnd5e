
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
        full: new fields.HTMLField(),
        summary: new fields.HTMLField()
      }),
      members: new fields.SetField(new fields.ForeignDocumentField(foundry.documents.BaseActor, {idOnly: true})),
      attributes: new fields.SchemaField({
        movement: new fields.SchemaField({
          land: new fields.NumberField({initial: 0, nullable: false, integer: true, min: 0}),
          water: new fields.NumberField({initial: 0, nullable: false, integer: true, min: 0}),
          air: new fields.NumberField({initial: 0, nullable: false, integer: true, min: 0})
        })
      }),
      currency: new fields.SchemaField({
        pp: new fields.NumberField({nullable: false, initial: 0, integer: true, min: 0}),
        gp: new fields.NumberField({nullable: false, initial: 0, integer: true, min: 0}),
        ep: new fields.NumberField({nullable: false, initial: 0, integer: true, min: 0}),
        sp: new fields.NumberField({nullable: false, initial: 0, integer: true, min: 0}),
        cp: new fields.NumberField({nullable: false, initial: 0, integer: true, min: 0})
      })
    };
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
    for ( const id of this._source.members ) {
      const a = game.actors.get(id);
      if ( a ) {
        if ( a.type === "group" ) {
          console.warn(`Group "${this._id}" may not contain another Group "${a.id}" as a member.`);
        }
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

  /**
   * Add a new member to the group.
   * @param {Actor5e} actor           A non-group Actor to add to the group
   * @returns {Promise<Actor5e>}      The updated group Actor
   */
  async addMember(actor) {
    if ( actor.type === "group" ) throw new Error("You may not add a group within a group.");
    if ( actor.pack ) throw new Error("You may only add Actors to the group which exist within the World.");
    const memberIds = this._source.members;
    if ( memberIds.includes(actor.id) ) return;
    return this.parent.update({
      system: {
        members: memberIds.concat([actor.id])
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Remove a member from the group.
   * @param {Actor5e|string} actor    An Actor or ID to remove from this group
   * @returns {Promise<Actor5e>}      The updated group Actor
   */
  async removeMember(actor) {
    const memberIds = foundry.utils.deepClone(this._source.members);

    // Handle user input
    let actorId;
    if ( typeof actor === "string" ) actorId = actor;
    else if ( actor instanceof Actor ) actorId = actor.id;
    else throw new Error("You must provide an Actor document or an actor ID to remove a group member");
    if ( !memberIds.includes(actorId) ) throw new Error(`Actor id "${actorId}" is not a group member`);

    // Remove the actor and update the parent document
    memberIds.findSplice(id => id === actorId);
    return this.parent.update({
      system: {
        members: memberIds
      }
    });
  }
}
