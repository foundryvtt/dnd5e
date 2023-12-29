import SystemDataModel from "../abstract.mjs";
import CurrencyTemplate from "../shared/currency.mjs";

const { ForeignDocumentField, HTMLField, NumberField, SchemaField, SetField, StringField } = foundry.data.fields;

/**
 * A data model and API layer which handles the schema and functionality of "group" type Actors in the dnd5e system.
 * @mixes CurrencyTemplate
 *
 * @property {object} type
 * @property {string} type.value                 Type of group represented (e.g. "Party", "Encounter", "Crew").
 * @property {object} description
 * @property {string} description.full           Description of this group.
 * @property {string} description.summary        Summary description (currently unused).
 * @property {Set<string>} members               IDs of actors belonging to this group in the world collection.
 * @property {object} attributes
 * @property {object} attributes.movement
 * @property {number} attributes.movement.land   Base movement speed over land.
 * @property {number} attributes.movement.water  Base movement speed over water.
 * @property {number} attributes.movement.air    Base movement speed through the air.
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
export default class GroupActor extends SystemDataModel.mixin(CurrencyTemplate) {
  /** @inheritdoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new SchemaField({
        value: new StringField({label: "DND5E.Group.Type"})
      }),
      description: new SchemaField({
        full: new HTMLField({label: "DND5E.Description"}),
        summary: new HTMLField({label: "DND5E.DescriptionSummary"})
      }),
      members: new SetField(
        new ForeignDocumentField(foundry.documents.BaseActor, {idOnly: true}), {label: "DND5E.GroupMembers"}
      ),
      attributes: new SchemaField({
        movement: new SchemaField({
          land: new NumberField({nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementLand"}),
          water: new NumberField({nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementWater"}),
          air: new NumberField({nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementAir"})
        })
      }, {label: "DND5E.Attributes"})
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
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

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * If type has been set to something other than "party" and this is currently the primary party, remove that setting.
   * @param {object} changed   The differential data that was changed relative to the documents prior values
   * @param {object} options   Additional options which modify the update request
   * @param {string} userId    The id of the User requesting the document update
   * @see {Document#_onUpdate}
   * @protected
   */
  _onUpdate(changed, options, userId) {
    if ( !foundry.utils.hasProperty(changed, "system.type.value") || (game.user !== game.users.activeGM)
      || (game.settings.get("dnd5e", "primaryParty")?.actor !== this.parent)
      || (foundry.utils.getProperty(changed, "system.type.value") === "party") ) return;
    game.settings.set("dnd5e", "primaryParty", { actor: null });
  }
}
