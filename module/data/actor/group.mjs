import { defaultUnits } from "../../utils.mjs";
import TravelField from "./fields/travel-field.mjs";
import GroupSystemFlags from "./group-system-flags.mjs";
import GroupTemplate from "./templates/group.mjs";

const { ArrayField, ForeignDocumentField, NumberField, SchemaField } = foundry.data.fields;

/**
 * @import { SkillToolRollProcessConfiguration } from "../../dice/_types.mjs";
 * @import { RestResult } from "../../documents/_types.mjs";
 * @import { GroupActorSystemData, GroupRestConfiguration, TravelPaceDescriptor } from "./_types.mjs";
 */

/**
 * A data model and API layer which handles the schema and functionality of "group" type Actors in the dnd5e system.
 * @extends {GroupTemplate<GroupActorSystemData>}
 * @mixes GroupActorSystemData
 */
export default class GroupData extends GroupTemplate {
  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new SchemaField({
        travel: new TravelField({}, {
          initialTime: () => CONFIG.DND5E.travelTimes.group, initialUnits: () => defaultUnits("travel")
        })
      }, { label: "DND5E.Attributes" }),
      details: new SchemaField({
        xp: new SchemaField({
          value: new NumberField({ integer: true, min: 0, label: "DND5E.ExperiencePoints.Current" })
        }, { label: "DND5E.ExperiencePoints.Label" })
      }, { label: "DND5E.Details" }),
      members: new ArrayField(new SchemaField({
        actor: new ForeignDocumentField(foundry.documents.BaseActor)
      }), { label: "DND5E.GroupMembers" }),
      primaryVehicle: new ForeignDocumentField(foundry.documents.BaseActor)
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
    GroupData.#migrateTravel(source);
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

  /**
   * Migrate travel speeds from `attributes.movement` to `attributes.travel`.
   * @param {object} source  The candidate source data from which the model will be constructed.
   */
  static #migrateTravel(source) {
    if ( !source.attributes?.movement ) return;
    const travel = source.attributes.travel ?? {};
    travel.paces ??= {};
    let { pace, units, ...paces } = source.attributes.movement;
    const config = CONFIG.DND5E.movementUnits[units];
    const finalUnit = config?.type === "metric" ? "kph" : "mph";
    const perRound = config?.travelResolution === "round";
    Object.keys(paces).forEach(k => {
      if ( travel.paces?.[k] !== undefined ) return;
      if ( perRound ) paces[k] = TravelField.convertMovementToTravel(paces[k], units, finalUnit) * 8;
      if ( paces[k] ) travel.paces[k] = paces[k];
    });
    if ( pace && (travel.pace === undefined) ) travel.pace = pace;
    if ( units && (travel.units === undefined) ) travel.units = finalUnit;
    delete source.attributes.movement;
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
    if ( !memberIds.has(this.primaryVehicle?.id) || (this.primaryVehicle?.type !== "vehicle") ) {
      Object.defineProperty(this, "primaryVehicle", { value: null });
    }
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareDerivedData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    TravelField.prepareData.call(this, rollData);
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
   * Get information on travel pace for this group.
   * @returns {TravelPaceDescriptor}
   */
  getTravelPace() {
    let { pace } = this.attributes.travel;
    const slowed = this.members.some(({ actor }) => {
      return actor?.system.isCreature && actor?.system.attributes?.movement?.slowed;
    });
    const travelPaces = Object.keys(CONFIG.DND5E.travelPace);
    const slow = travelPaces.indexOf("slow");
    if ( slowed && (travelPaces.indexOf(pace) > slow) ) pace = "slow";
    const { travel: vehicleTravel } = this.primaryVehicle?.system.attributes ?? {};
    const paces = { ...(vehicleTravel?.paces ?? this.attributes.travel.paces) };
    if ( (slowed && !this.primaryVehicle) || (this.primaryVehicle?.system.details.type === "land") ) {
      const { units } = vehicleTravel ?? this.attributes.travel;
      const unitConfig = CONFIG.DND5E.travelUnits[units];
      for ( const [k, v] of Object.entries(vehicleTravel?.paces ?? this.attributes.travel.prePace) ) {
        paces[k] = TravelField.applyPaceMultiplier(v, pace, unitConfig.type);
      }
    }
    return {
      pace: {
        slowed,
        available: !this.primaryVehicle || (this.primaryVehicle.system.details.type === "land"),
        label: CONFIG.DND5E.travelPace[pace]?.label,
        value: pace
      },
      paces: { ...paces }
    };
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

    // Remove the actor and update the parent document
    const membersCollection = this.toObject().members;
    if ( !membersCollection.findSplice(member => member.actor === actorId) ) {
      throw new Error(`Actor id "${actorId}" is not a group member`);
    }
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

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    if ( this.parent._stats?.compendiumSource?.startsWith("Compendium.") ) return;
    this.parent.updateSource({ "prototypeToken.actorLink": true });
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
      since: "DnD5e 5.1", until: "DnD5e 5.3"
    });
    super(...args);
  }
}
