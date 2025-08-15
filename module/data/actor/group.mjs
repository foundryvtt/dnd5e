import { defaultUnits } from "../../utils.mjs";
import MovementField from "../shared/movement-field.mjs";
import GroupSystemFlags from "./group-system-flags.mjs";
import GroupTemplate from "./templates/group.mjs";

const { ArrayField, ForeignDocumentField, NumberField, SchemaField, StringField } = foundry.data.fields;

/**
 * @import { RestConfiguration, RestResult } from "../../documents/actor/actor.mjs";
 * @import { TravelPace5e } from "../shared/movement-field.mjs";
 */

/**
 * Metadata associated with members in this group.
 * @typedef PartyMemberData
 * @property {Actor5e} actor              Associated actor document.
 */

/**
 * @typedef {RestConfiguration} GroupRestConfiguration
 * @param {boolean} [autoRest]  Automatically perform rest for group members rather than creating request message.
 * @param {string[]} [targets]  IDs of actors to rest. If not provided, then all group actors will be rested.
 */

/**
 * A data model and API layer which handles the schema and functionality of "group" type Actors in the dnd5e system.
 * @extends {GroupTemplate}
 *
 * @property {PartyMemberData[]} members         Members in this group with associated metadata.
 * @property {object} attributes
 * @property {object} attributes.movement
 * @property {number} attributes.movement.land   Base movement speed over land.
 * @property {number} attributes.movement.water  Base movement speed over water.
 * @property {number} attributes.movement.air    Base movement speed through the air.
 * @property {TravelPace5e} attributes.movement.pace  Travel pace.
 * @property {string} attributes.movement.unit   The length units.
 * @property {object} details
 * @property {object} details.xp
 * @property {number} details.xp.value           XP currently available to be distributed to a party.
 */
export default class GroupData extends GroupTemplate {
  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      members: new ArrayField(new SchemaField({
        actor: new ForeignDocumentField(foundry.documents.BaseActor)
      }), { label: "DND5E.GroupMembers" }),
      attributes: new SchemaField({
        movement: new SchemaField({
          land: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementLand"
          }),
          water: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementWater"
          }),
          air: new NumberField({
            nullable: false, min: 0, step: 0.1, initial: 0, speed: true, label: "DND5E.MovementAir"
          }),
          pace: new StringField({
            required: true, blank: false, initial: "normal", choices: () => CONFIG.DND5E.travelPace,
            label: "DND5E.Travel.Label"
          }),
          units: new StringField({
            required: true, nullable: true, blank: false, label: "DND5E.MovementUnits", initial: defaultUnits("travel")
          })
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

  /**
   * Return only group members that are creatures.
   * @type {Actor5e[]}
   */
  get creatures() {
    return this.members.reduce((acc, { actor }) => {
      if ( actor?.system.isCreature ) acc.push(actor);
      return acc;
    }, []);
  }

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
    return this.members.reduce((acc, { actor }) => {
      if ( actor?.type === "character" ) acc.push(actor);
      return acc;
    }, []);
  }

  /* -------------------------------------------- */

  /**
   * Calculate the party's average level for the purpose determining encounter XP budget.
   * @type {number}
   */
  get level() {
    const pcs = this.playerCharacters;
    if ( !pcs.length ) return 0;
    return Math.round(pcs.reduce((acc, a) => acc + a.system.details.level, 0) / pcs.length);
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    GroupData.#migrateMembers(source);
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
        console.warn(`Actor "${id}" in group "${this.parent.id}" does not exist within the World.`);
      } else if ( member.actor?.system.isGroup ) {
        console.warn(`Group "${this.parent.id}" may not contain another Group "${member.actor.id}" as a member.`);
      } else if ( memberIds.has(member.actor.id) ) {
        console.warn(`Actor "${member.actor.id}" duplicated in Group "${this.parent.id}".`);
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
    this.parent.labels.pace = CONFIG.DND5E.travelPace[this.attributes.movement.pace]?.label;
    MovementField.prepareData.call(this.attributes.movement, this.schema.getField("attributes.movement"));
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
    if ( actor.system.isGroup ) {
      throw new Error("You may not add a group within a group.");
    }
    if ( actor.pack ) throw new Error("You may only add Actors to the group which exist within the World.");
    if ( this.members.ids.has(actor.id) ) return this.parent;
    const membersCollection = this.toObject().members;
    membersCollection.push({ actor: actor.id });
    return this.parent.update({"system.members": membersCollection});
  }

  /* -------------------------------------------- */

  /** @override */
  async getMembers() {
    return this.members.map(({ actor, ...data }) => ({ actor, ...data })).filter(d => d.actor);
  }

  /* -------------------------------------------- */

  /** @override */
  async getPlaceableMembers() {
    return this.getMembers();
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
   * Request a group ability check with a given skill.
   * @param {Partial<SkillToolRollProcessConfiguration>} config  Roll configuration.
   * @returns {Promise<false|void>}
   */
  async rollSkill(config) {
    if ( !config.skill ) return;
    const skillConfig = CONFIG.DND5E.skills[config.skill];
    const ability = config.ability ?? skillConfig?.ability ?? "";
    const skillLabel = skillConfig?.label ?? "";
    const abilityLabel = CONFIG.DND5E.abilities[ability]?.label ?? "";
    await foundry.documents.ChatMessage.implementation.create({
      flavor: game.i18n.format("DND5E.SkillPromptTitle", { skill: skillLabel, ability: abilityLabel }),
      speaker: ChatMessage.getSpeaker({ actor: this.parent, alias: this.parent.name }),
      system: {
        button: {
          icon: "fa-solid fa-dice-d20",
          label: game.i18n.localize("DND5E.SkillRoll", { skill: skillLabel, ability: abilityLabel })
        },
        data: { ...config },
        handler: "skill",
        targets: this.members.flatMap(({ actor }) => {
          if ( actor.system.skills ) return { actor: actor.uuid };
          return [];
        })
      },
      type: "request"
    });
    return false;
  }

  /* -------------------------------------------- */
  /*  Resting                                     */
  /* -------------------------------------------- */

  /**
   * Initiate a rest for all members of this group.
   * @param {GroupRestConfiguration} config  Configuration data for the rest.
   * @param {RestResult} result              Results of the rest operation being built.
   * @returns {boolean}                      Returns `false` to prevent regular rest process from completing.
   */
  async rest(config, result) {
    const targets = this.members
      .map(({ actor }) => !config.targets || config.targets.includes(actor.id) ? actor : null)
      .filter(_ => _);

    // Create a rest chat message
    if ( !config.autoRest ) {
      const restConfig = CONFIG.DND5E.restTypes[config.type];
      const messageData = {
        flavor: this.parent.createRestFlavor(config),
        speaker: ChatMessage.getSpeaker({ actor: this.parent, alias: this.parent.name }),
        system: {
          button: {
            icon: restConfig.icon ?? "fa-solid fa-bed",
            label: restConfig.label
          },
          data: {
            newDay: config.newDay === true,
            recoverTemp: config.recoverTemp === true,
            recoverTempMax: config.recoverTempMax === true,
            type: config.type
          },
          handler: "rest",
          targets: targets.map(t => ({ actor: t.uuid }))
        },
        type: "request"
      };
      await ChatMessage.create(messageData);
    }

    const results = new Map();
    for ( const actor of targets ) {
      results.set(
        actor,
        config.autoRest ? await actor[config.type === "short" ? "shortRest" : "longRest"]({
          ...config, dialog: false, advanceBastionTurn: false, advanceTime: false
        }) ?? null : null
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
}

/* -------------------------------------------- */

/**
 * @deprecated
 * @since 5.1.0
 */
export class GroupActor extends GroupData {
  constructor(...args) {
    foundry.utils.logCompatibilityWarning("GroupActor is deprecated. Please use GroupData instead.", {
      since: "DnD5e 5.1", until: "DND5e 5.3"
    });
    super(...args);
  }
}
