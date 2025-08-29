import { convertWeight } from "../../utils.mjs";
import MultiActorSheet from "./api/multi-actor-sheet.mjs";
import Award from "../award.mjs";

/**
 * Extension of the base actor sheet for group actors.
 */
export default class GroupActorSheet extends MultiActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["group", "vertical-tabs"],
    position: {
      width: 700,
      height: 700
    },
    actions: {
      award: GroupActorSheet.#onAward,
      changePace: GroupActorSheet.#onChangePace,
      roll: GroupActorSheet.#onRoll
    },
    tab: "members"
  };

  /* -------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/dnd5e/templates/actors/group/header.hbs"
    },
    members: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/members.hbs",
      templates: ["systems/dnd5e/templates/actors/group/member.hbs"],
      scrollable: [""]
    },
    inventory: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/inventory.hbs",
      templates: [
        "systems/dnd5e/templates/inventory/inventory.hbs", "systems/dnd5e/templates/inventory/activity.hbs",
        "systems/dnd5e/templates/inventory/containers.hbs", "systems/dnd5e/templates/inventory/encumbrance.hbs"
      ],
      scrollable: [".sidebar", ".body"]
    },
    biography: {
      container: { classes: ["tab-body"], id: "tabs" },
      template: "systems/dnd5e/templates/actors/group/biography.hbs",
      scrollable: [""]
    },
    tabs: {
      id: "tabs",
      classes: ["tabs-right"],
      template: "systems/dnd5e/templates/shared/sidebar-tabs.hbs"
    }
  };

  /* -------------------------------------------- */

  /** @override */
  static TABS = [
    { tab: "members", label: "DND5E.Group.Member.other", icon: "fa-solid fa-users"},
    { tab: "inventory", label: "DND5E.Inventory", svg: "systems/dnd5e/icons/svg/backpack.svg" },
    { tab: "biography", label: "DND5E.Biography", icon: "fa-solid fa-feather" }
  ];

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _configureInventorySections(sections) {
    sections.forEach(s => s.minWidth = 200);
  }

  /* -------------------------------------------- */

  /**
   * Prepare the header context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {ApplicationRenderContext}
   * @protected
   */
  async _prepareHeaderContext(context, options) {
    context.showXP = game.settings.get("dnd5e", "levelingMode") !== "noxp";
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareInventoryContext(context, options) {
    context = await super._prepareInventoryContext(context, options);
    context.members = [];
    for ( const { actor } of this.document.system.members ) {
      if ( !actor ) continue;
      const { id, type, img, name, system, uuid } = actor;
      const member = { id, type, img, name, system, uuid };
      this._prepareMemberEncumbrance(actor, member);
      context.members.push(member);
    }
    context.members.sort((a, b) => a.type.compare(b.type) || a.name.localeCompare(b.name, game.i18n.lang));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Prepare members context.
   * @param {ApplicationRenderContext} context     Shared context provided by _prepareContext.
   * @param {HandlebarsRenderOptions} options      Options which configure application rendering behavior.
   * @returns {Promise<ApplicationRenderContext>}
   * @protected
   */
  async _prepareMembersContext(context, options) {
    context.sections = {
      character: { members: [], hasStats: true },
      npc: { members: [], label: "TYPES.Actor.npcPl", hasStats: true },
      vehicle: { members: [], label: "TYPES.Actor.vehiclePl" }
    };
    for ( const { actor } of this.document.system.members ) {
      if ( !actor ) continue;
      const { id, type, img, name, system, uuid } = actor;
      const section = context.sections[type];
      if ( !section ) continue;
      const member = { id, type, img, name, system, uuid };
      member.classes = actor.itemTypes.class;
      await this._prepareMemberPortrait(actor, member);
      this._prepareMemberEncumbrance(actor, member);
      this._prepareMemberSkills(actor, member);
      switch ( type ) {
        case "character": await this._prepareCharacterContext(actor, member, options); break;
        case "npc": await this._prepareNPCContext(actor, member, options); break;
        case "vehicle": await this._prepareVehicleContext(actor, member, options); break;
      }
      section.members.push(member);
    }
    Object.values(context.sections).forEach(s => {
      s.members.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
    });
    return context;
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "biography": return this._prepareDescriptionContext(context, options);
      case "header": return this._prepareHeaderContext(context, options);
      case "inventory": return this._prepareInventoryContext(context, options);
      case "members": return this._prepareMembersContext(context, options);
      case "tabs": return this._prepareTabsContext(context, options);
    }
    return context;
  }

  /* -------------------------------------------- */
  /*  Member Preparation Helpers                  */
  /* -------------------------------------------- */

  /**
   * Prepare render context for player characters.
   * @param {Actor5e} actor                    The player character actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareCharacterContext(actor, context, options) {
    const { originalClass } = context.system.details;
    const cls = actor.items.get(originalClass);
    if ( cls ) context.underlay = `var(--underlay-${cls.identifier})`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare encumbrance context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  _prepareMemberEncumbrance(actor, context) {
    const { pct, max, value } = actor.system.attributes.encumbrance;
    const defaultUnits = CONFIG.DND5E.encumbrance.baseUnits.default;
    const baseUnits = CONFIG.DND5E.encumbrance.baseUnits[actor.type] ?? defaultUnits;
    const systemUnits = game.settings.get("dnd5e", "metricWeightUnits") ? "metric" : "imperial";
    context.encumbrance = {
      pct,
      max: convertWeight(max, baseUnits[systemUnits], defaultUnits[systemUnits]),
      value: convertWeight(value, baseUnits[systemUnits], defaultUnits[systemUnits])
    };
  }

  /* -------------------------------------------- */

  /**
   * Prepare skills context for members.
   * @param {Actor5e} actor   The actor instance.
   * @param {object} context  The render context.
   * @protected
   */
  _prepareMemberSkills(actor, context) {
    context.skills = Object.fromEntries(Object.entries(actor.system.skills ?? {}).map(([key, skill]) => {
      const { ability, passive, total } = skill;
      const label = game.i18n.format("DND5E.SkillRoll", {
        ability: CONFIG.DND5E.abilities[ability]?.label,
        skill: CONFIG.DND5E.skills[key]?.label
      });
      return [key, { label, passive, total }];
    }));
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for NPCs.
   * @param {Actor5e} actor                    The NPC actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareNPCContext(actor, context, options) {
    context.underlay = `var(--underlay-npc-${actor.system.details.type.value})`;
  }

  /* -------------------------------------------- */

  /**
   * Prepare render context for vehicles.
   * @param {Actor5e} actor                    The vehicle actor.
   * @param {object} context                   The render context.
   * @param {HandlebarsRenderOptions} options  Options which configure application rendering behavior.
   * @returns {Promise<void>}
   * @protected
   */
  async _prepareVehicleContext(actor, context, options) {
    context.underlay = `var(--underlay-vehicle-${actor.system.vehicleType})`;
    const { attributes } = actor.system;
    context.properties = [];
    if ( attributes.ac.value ) context.properties.push({ label: "DND5E.AC", value: attributes.ac.value });
    if ( attributes.hp.dt ) context.properties.push({ label: "DND5E.HITPOINTS.DT.Abbr", value: attributes.hp.dt });
    const speed = Math.max(...Object.values(attributes.movement.paces).map(p => p ?? -Infinity));
    if ( Number.isFinite(speed) ) context.properties.push({ label: "DND5E.Speed", value: speed });
  }

  /* -------------------------------------------- */
  /*  Event Listeners & Handlers                  */
  /* -------------------------------------------- */

  /**
   * Handle distributing XP & currency.
   * @this {GroupActorSheet}
   */
  static #onAward() {
    new Award({
      award: { savedDestinations: this.actor.getFlag("dnd5e", "awardDestinations") },
      origin: this.actor
    }).render({ force: true });
  }

  /* -------------------------------------------- */

  /**
   * Handle cycling travel pace.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static #onChangePace(event, target) {
    const increment = Number(target.dataset.increment);
    if ( Number.isNaN(increment) ) return;
    const paces = Object.keys(CONFIG.DND5E.travelPace);
    const current = paces.indexOf(this.actor.system._source.attributes.movement.pace);
    const next = (((current + increment) % paces.length) + paces.length) % paces.length;
    this.actor.update({ "system.attributes.movement.pace": paces[next] });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onDropItem(event, item) {
    const { uuid } = event.target.closest("[data-uuid]")?.dataset ?? {};
    const target = await fromUuid(uuid);
    if ( target instanceof foundry.documents.Actor ) return target.sheet._onDropCreateItems(event, [item]);
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------- */

  /**
   * Handle a roll for an individual group member.
   * @this {GroupActorSheet}
   * @param {PointerEvent} event  The triggering event.
   * @param {HTMLElement} target  The action target.
   */
  static async #onRoll(event, target) {
    const { type, key } = target.dataset;
    if ( type !== "skill" ) return;
    const { uuid } = target.closest("[data-uuid]")?.dataset ?? {};
    const actor = await fromUuid(uuid);
    actor?.rollSkill({ event, skill: key, pace: this.actor.system.attributes.movement.pace });
  }
}
