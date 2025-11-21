import GroupTemplate from "./templates/group.mjs";
import FormulaField from "../fields/formula-field.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { EncounterActorSystemData } from "./_types.mjs";
 */

/**
 * An Actor that represents a collection of adversaries.
 * @extends {GroupTemplate<EncounterActorSystemData>}
 * @mixes EncounterActorSystemData
 */
export default class EncounterData extends GroupTemplate {
  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      members: new ArrayField(new SchemaField({
        uuid: new DocumentUUIDField({ type: "Actor" }),
        quantity: new SchemaField({
          value: new NumberField({ initial: 1, integer: true, min: 0, label: "DND5E.Quantity" }),
          formula: new FormulaField({ label: "DND5E.QuantityFormula" })
        })
      }), { label: "DND5E.GroupMembers" })
    });
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    EncounterData.#migrateMembers(source);
  }

  /* -------------------------------------------- */

  /**
   * Migrate group members from world IDs to UUIDs.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateMembers(source) {
    const { members } = source;
    if ( !members ) return;
    source.members = members.map(m => {
      if ( m.actor && !m.uuid ) {
        m.uuid = `Actor.${m.actor}`;
        delete m.actor;
      }
      return m;
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
  /*  Methods                                     */
  /* -------------------------------------------- */

  /**
   * Add new members to the group.
   * @param {...Actor5e} actors   The actors to add.
   * @returns {Promise<Actor5e>}  The updated encounter Actor.
   */
  async addMember(...actors) {
    const members = this.toObject().members;
    for ( const actor of actors ) {
      if ( actor.type !== "npc" ) throw new Error("Only NPC actors can be part of encounters.");
      let existing = false;
      for ( const member of members ) {
        if ( (member.uuid === actor.uuid) && member.quantity?.value ) {
          member.quantity.value++;
          existing = true;
        }
      }
      if ( !existing ) members.push({ uuid: actor.uuid });
    }
    return this.parent.update({ "system.members": members });
  }

  /* -------------------------------------------- */

  /**
   * Get the difficulty for this encounter for a given party.
   * @param {Actor5e} [party]  A party to determine difficulty against, otherwise it uses the world's primary party.
   * @returns {Promise<"low"|"moderate"|"high"|null>}
   */
  async getDifficulty(party) {
    party ??= game.actors.party;
    if ( party?.type !== "group" ) return null;
    const xp = await this.getXPValue();
    const { creatures, level } = party.system;
    const [low, med] = (CONFIG.DND5E.ENCOUNTER_DIFFICULTY[level] ?? []).map(t => t * creatures.length);
    if ( !low ) return null;
    if ( xp <= low ) return "low";
    else if ( xp <= med ) return "moderate";
    return "high";
  }

  /* -------------------------------------------- */

  /** @override */
  async getMembers() {
    // Batch compendium lookups when retrieving members.
    const collections = new Map();
    const members = new Map();

    for ( const { uuid, ...rest } of this.members ) {
      const { collection, id } = foundry.utils.parseUuid(uuid);
      let ids = collections.get(collection);
      if ( !ids ) {
        ids = [];
        collections.set(collection, ids);
      }
      ids.push(id);
      rest.collection = collection;
      members.set(id, rest);
    }

    for ( const [collection, ids] of collections.entries() ) {
      if ( collection instanceof foundry.documents.collections.CompendiumCollection ) {
        await collection.getDocuments({ _id__in: ids });
      }
    }

    return Array.from(members.entries().map(([id, { collection, ...data }]) => {
      return { actor: collection.get(id), ...foundry.utils.deepClone(data) };
    }).filter(d => d.actor));
  }

  /* -------------------------------------------- */

  /** @override */
  async getPlaceableMembers() {
    return Promise.all((await this.getMembers()).map(async member => {
      member.actor = await dnd5e.documents.Actor5e.fetchExisting(member.actor.uuid);
      if ( (member.quantity.value === null) && member.quantity.formula ) {
        const roll = new Roll(member.quantity.formula);
        await roll.evaluate();
        if ( roll.total > 0 ) member.quantity.value = roll.total;
      }
      return member;
    }));
  }

  /* -------------------------------------------- */

  /**
   * Get the XP value of this encounter.
   * @returns {Promise<number>}
   */
  async getXPValue() {
    return (await this.getMembers()).reduce((xp, { actor, quantity }) => {
      return xp + ((quantity.value ?? 0) * (actor?.system.details?.xp?.value ?? 0));
    }, 0);
  }

  /* -------------------------------------------- */

  /**
   * Remove a member from the group.
   * @param {Actor5e|string} actor  An actor or its UUID to remove from this group.
   * @returns {Promise<Actor5e>}    The updated encounter Actor.
   */
  async removeMember(actor) {
    const uuid = typeof actor === "string" ? actor : actor.uuid;
    if ( !this.members.uuids.has(uuid) ) return this.parent;
    const members = this.toObject().members;
    return this.parent.update({ "system.members": members.filter(m => m.uuid !== uuid) });
  }

  /* -------------------------------------------- */

  /**
   * Roll the quantity formulas for each member and replace their quantity. Any entries without formulas
   * will not be modified.
   * @param {object} [options={}]
   * @param {number} [options.index]  Index of a specific member to roll.
   * @returns {Promise<Actor5e>}
   */
  async rollQuantities({ index }={}) {
    const membersCollection = this.toObject().members;
    await Promise.all(membersCollection.map(async (member, i) => {
      if ( !member.quantity?.formula || ((index !== undefined) && (index !== i)) ) return member;
      const roll = new Roll(member.quantity.formula);
      await roll.evaluate();
      if ( roll.total > 0 ) member.quantity.value = roll.total;
    }));
    return this.parent.update({ "system.members": membersCollection });
  }
}
