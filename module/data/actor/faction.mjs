import { bulkFromUuid } from "../../utils.mjs";
import IdentifierField from "../fields/identifier-field.mjs";
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
export default class FactionData extends GroupTemplate {

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
      ranks: new ArrayField(new StringField()),
      source: new SourceField(),
      type: new SchemaField({
        value: new IdentifierField()
      })
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
    const uuids = new Set(this.members.uuids);
    for ( const actor of actors ) {
      if ( !actor.system.isCreature ) throw new Error("Only creature actors can be part of factions.");
      if ( !uuids.has(actor.uuid) ) {
        members.push({ uuid: actor.uuid });
        uuids.add(actor.uuid);
      }
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
  async _preUpdate(changes, options, user) {
    if ( await super._preUpdate(changes, options, user) === false ) return false;
    const identifierChanged = (("name" in changes) && !this.identifier) || ("identifier" in (changes.system ?? {}));
    if ( !this.parent.inCompendium && identifierChanged ) {
      foundry.utils.setProperty(options, "dnd5e.unregisterFaction", this.parent.identifier);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if ( options.dnd5e?.unregisterFaction ) {
      dnd5e.registry.renown.unregisterFaction(this.parent, options.dnd5e.unregisterFaction);
      dnd5e.registry.renown.registerFaction(this.parent);
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if ( !this.parent.inCompendium ) dnd5e.registry.renown.unregisterFaction(this.parent);
  }
}
