import { bulkFromUuid } from "../../utils.mjs";
import SourceField from "../shared/source-field.mjs";
import GroupTemplate from "./templates/group.mjs";

const { ArrayField, DocumentUUIDField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { FactionActorSystemData } from "./_types.mjs";
 */

/**
 * An actor representing a faction.
 * @extends {GroupTemplate<FactionActorSystemData>}
 * @mixes FactionActorSystemData
 */
export default class GroupData extends GroupTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.SOURCE"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      members: new ArrayField(new SchemaField({
        uuid: new DocumentUUIDField({ type: "Actor" }),
        rank: new StringField(),
        role: new StringField()
      }), { label: "DND5E.Group.Member.other" }),
      source: new SourceField(),
      ranks: new ArrayField(new StringField())
    });
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    super.prepareBaseData();
    Object.defineProperty(this.members, "uuids", {
      value: new Set(this.members.map(m => m.uuid)),
      enumerable: false,
      writable: false,
      configurable: true
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    if ( this.parent.uuid && !this.parent.inCompendium ) dnd5e.registry.renown.registerFaction(this.parent);
    SourceField.prepareData.call(this.source, this.parent._stats?.compendiumSource ?? this.parent.uuid);
  }

  /* -------------------------------------------- */
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Add new members to the group.
   * @param {...Actor5e} actors   The actors to add.
   * @returns {Promise<Actor5e>}  The updated group Actor.
   */
  async addMember(...actors) {
    const members = this.toObject().members;
    for ( const actor of actors ) {
      if ( !actor.system.isCreature ) throw new Error("Only creature actors can be part of factions.");
      if ( !this.members.uuids.has(actor.uuids) ) members.push({ uuid: actor.uuid });
    }
    return this.parent.update({ "system.members": members });
  }

  /* -------------------------------------------- */

  /** @override */
  async getMembers() {
    const members = await bulkFromUuid(this.members.map(m => m.uuid));
    return this.members.map(data => ({
      actor: members.get(data.uuid), ...foundry.utils.deepClone(data)
    })).filter(d => d.actor);
  }

  /* -------------------------------------------- */

  /**
   * Remove a member from the group.
   * @param {Actor5e|string} actor    An Actor or ID to remove from this group
   * @returns {Promise<Actor5e>}      The updated group Actor
   */
  async removeMember(actor) {
    const uuid = typeof actor === "string" ? actor : actor.uuid;
    if ( !this.members.uuids.has(uuid) ) return this.parent;
    const members = this.toObject().members;
    return this.parent.update({ "system.members": members.filter(m => m.uuid !== uuid) });
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( !this.parent.inCompendium ) dnd5e.registry.renown.unregisterFaction(this.parent);
  }
}
