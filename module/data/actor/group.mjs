import TokenPlacement from "../../canvas/token-placement.mjs";
import { ActorDataModel } from "../abstract.mjs";
import FormulaField from "../fields/formula-field.mjs";
import CurrencyTemplate from "../shared/currency.mjs";
import GroupSystemFlags from "./group-system-flags.mjs";

const { ArrayField, ForeignDocumentField, HTMLField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * Metadata associated with members in this group.
 * @typedef {object} GroupMemberData
 * @property {Actor5e} actor              Associated actor document.
 * @property {object} quantity
 * @property {number} quantity.value      Number of this actor in the group (for encounter or crew types).
 * @property {string} [quantity.formula]  Formula used for re-rolling actor quantities in encounters.
 */

/**
 * A data model and API layer which handles the schema and functionality of "group" type Actors in the dnd5e system.
 * @mixes CurrencyTemplate
 *
 * @property {object} type
 * @property {string} type.value                 Type of group represented (e.g. "Party", "Encounter", "Crew").
 * @property {object} description
 * @property {string} description.full           Description of this group.
 * @property {string} description.summary        Summary description (currently unused).
 * @property {GroupMemberData[]} members         Members in this group with associated metadata.
 * @property {object} attributes
 * @property {object} attributes.movement
 * @property {number} attributes.movement.land   Base movement speed over land.
 * @property {number} attributes.movement.water  Base movement speed over water.
 * @property {number} attributes.movement.air    Base movement speed through the air.
 * @property {object} details
 * @property {object} details.xp
 * @property {number} details.xp.value           XP currently available to be distributed to a party.
 *
 * @example Create a new Group
 * const g = new dnd5e.documents.Actor5e({
 *  type: "group",
 *  name: "Test Group",
 *  system: {
 *    members: [{ actor: "3f3hoYFWUgDqBP4U" }]
 *  }
 * });
 */
export default class GroupActor extends ActorDataModel.mixin(CurrencyTemplate) {
  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      type: new SchemaField({
        value: new StringField({ initial: "party", label: "DND5E.Group.Type" })
      }),
      description: new SchemaField({
        full: new HTMLField({ label: "DND5E.Description" }),
        summary: new HTMLField({ label: "DND5E.DescriptionSummary" })
      }),
      members: new ArrayField(new SchemaField({
        actor: new ForeignDocumentField(foundry.documents.BaseActor),
        quantity: new SchemaField({
          value: new NumberField({ initial: 1, integer: true, min: 0, label: "DND5E.Quantity" }),
          formula: new FormulaField({ label: "DND5E.QuantityFormula" })
        })
      }), { label: "DND5E.GroupMembers" }),
      attributes: new SchemaField({
        movement: new SchemaField({
          land: new NumberField({ nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementLand" }),
          water: new NumberField({ nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementWater" }),
          air: new NumberField({ nullable: false, min: 0, step: 0.1, initial: 0, label: "DND5E.MovementAir" })
        })
      }, { label: "DND5E.Attributes" }),
      details: new SchemaField({
        xp: new SchemaField({
          value: new NumberField({ integer: true, min: 0, label: "DND5E.ExperiencePoints.Current" })
        }, { label: "DND5E.ExperiencePoints.Label" })
      }, { label: "DND5E.Details" })
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    systemFlagsModel: GroupSystemFlags
  }, {inplace: false}));

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  get transferDestinations() {
    return this.members.map(m => m.actor).filter(a => a.isOwner);
  }

  /* -------------------------------------------- */

  /**
   * Return only the group members that are characters.
   * @type {Actor5e[]}
   */
  get playerCharacters() {
    return this.members.map(m => m.actor).filter(a => a.type === "character");
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    GroupActor.#migrateMembers(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate group members from set of IDs into array of metadata objects.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMembers(source) {
    if ( foundry.utils.getType(source.members) !== "Array" ) return;
    source.members = source.members.map(m => {
      if ( foundry.utils.getType(m) === "Object" ) return m;
      return { actor: m };
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    const memberIds = new Set();
    this.members = this.members.filter((member, index) => {
      if ( !member.actor ) {
        const id = this._source.members[index]?.actor;
        console.warn(`Actor "${id}" in group "${this._id}" does not exist within the World.`);
      } else if ( member.actor.type === "group" ) {
        console.warn(`Group "${this._id}" may not contain another Group "${member.actor.id}" as a member.`);
      } else if ( memberIds.has(member.actor.id) ) {
        console.warn(`Actor "${member.actor.id}" duplicated in Group "${this._id}".`);
      } else {
        memberIds.add(member.actor.id);
        return true;
      }
      return false;
    });
    Object.defineProperty(this.members, "ids", {
      value: memberIds,
      enumerable: false,
      writable: false
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const system = this;
    Object.defineProperty(this.details.xp, "derived", {
      get() {
        return system.type.value === "encounter" ? system.members.reduce((xp, { actor, quantity }) =>
          xp + ((actor.system.details?.xp?.value ?? 0) * (quantity.value ?? 1))
        , 0) : null;
      },
      configurable: true,
      enumerable: false
    });
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
    if ( this.members.ids.has(actor.id) ) return;
    const membersCollection = this.toObject().members;
    membersCollection.push({ actor: actor.id });
    return this.parent.update({"system.members": membersCollection});
  }

  /* -------------------------------------------- */

  /**
   * Place all members in the group on the current scene.
   */
  async placeMembers() {
    if ( !game.user.isGM || !canvas.scene ) return;
    const minimized = !this.parent.sheet._minimized;
    await this.parent.sheet.minimize();
    const tokensData = [];

    try {
      const placements = await TokenPlacement.place({
        tokens: Object.values(this.members).flatMap(({ actor, quantity }) =>
          Array(this.type.value === "encounter" ? (quantity.value ?? 1) : 1).fill(actor.prototypeToken)
        )
      });
      for ( const placement of placements ) {
        const actor = placement.prototypeToken.actor;
        const appendNumber = !placement.prototypeToken.actorLink && placement.prototypeToken.appendNumber;
        delete placement.prototypeToken;
        const tokenDocument = await actor.getTokenDocument(placement);
        if ( appendNumber ) TokenPlacement.adjustAppendedNumber(tokenDocument, placement);
        tokensData.push(tokenDocument.toObject());
      }
    } finally {
      if ( minimized ) this.parent.sheet.maximize();
    }

    await canvas.scene.createEmbeddedDocuments("Token", tokensData);
  }

  /* -------------------------------------------- */

  /**
   * Remove a member from the group.
   * @param {Actor5e|string} actor    An Actor or ID to remove from this group
   * @returns {Promise<Actor5e>}      The updated group Actor
   */
  async removeMember(actor) {
    // Handle user input
    let actorId;
    if ( typeof actor === "string" ) actorId = actor;
    else if ( actor instanceof Actor ) actorId = actor.id;
    else throw new Error("You must provide an Actor document or an actor ID to remove a group member");
    if ( !this.members.ids.has(actorId) ) throw new Error(`Actor id "${actorId}" is not a group member`);

    // Remove the actor and update the parent document
    const membersCollection = this.toObject().members;
    membersCollection.findSplice(member => member.actor === actorId);
    return this.parent.update({"system.members": membersCollection});
  }

  /* -------------------------------------------- */

  /**
   * Roll the quantity formulas for each member and replace their quantity. Any entries without formulas
   * will not be modified.
   * @returns {Promise<Actor5e>}
   */
  async rollQuantities() {
    const membersCollection = this.toObject().members;
    await Promise.all(membersCollection.map(async member => {
      if ( !member.quantity?.formula ) return member;
      const roll = new Roll(member.quantity.formula);
      await roll.evaluate();
      if ( roll.total > 0 ) member.quantity.value = roll.total;
    }));
    return this.parent.update({"system.members": membersCollection});
  }

  /* -------------------------------------------- */
  /*  Resting                                     */
  /* -------------------------------------------- */

  /**
   * Initiate a rest for all members of this group.
   * @param {RestConfiguration} config  Configuration data for the rest.
   * @param {RestResult} result         Results of the rest operation being built.
   * @returns {boolean}                 Returns `false` to prevent regular rest process from completing.
   */
  async rest(config, result) {
    const results = new Map();
    for ( const member of this.members ) {
      results.set(
        member.actor,
        await member.actor[config.type === "short" ? "shortRest" : "longRest"]({
          ...config, dialog: false, advanceBastionTurn: false, advanceTime: false
        }) ?? null
      );
    }

    // Advance the game clock
    if ( config.advanceTime && (config.duration > 0) && game.user.isGM ) await game.time.advance(60 * config.duration);

    /**
     * A hook event that fires when the rest process is completed for a group.
     * @function dnd5e.groupRestCompleted
     * @memberof hookEvents
     * @param {Actor5e} group                         The group that just completed resting.
     * @param {Map<Actor5e, RestResult|null>} result  Details on the rests completed.
     */
    Hooks.callAll("dnd5e.groupRestCompleted", this.parent, results);

    if ( config.advanceBastionTurn && game.user.isGM && game.settings.get("dnd5e", "bastionConfiguration").enabled ) {
      await dnd5e.bastion.advanceAllBastions();
    }

    return false;
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
